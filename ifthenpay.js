/*!
 * Ifthenpay Browser SDK
 * Single-file browser helper exposed as window.Ifthenpay.
 */
(function attachIfthenpay(global) {
  'use strict';

  var ENDPOINTS = {
    mbwayInit: 'https://api.ifthenpay.com/spg/payment/mbway',
    multibancoInit: 'https://api.ifthenpay.com/multibanco/reference/init',
    payshopInit: 'https://ifthenpay.com/api/payshop/reference/',
    pixInit: 'https://api.ifthenpay.com/pix/init/',
    creditCardInit: 'https://api.ifthenpay.com/creditcard/init/',
    cofidisInit: 'https://api.ifthenpay.com/cofidis/init/',
    payByLinkInit: 'https://api.ifthenpay.com/gateway/pinpay/',
  };

  /**
   * @typedef {Object} IfthenpayClientOptions
   * @property {string=} authToken
   * @property {string=} creditCardSuccessUrl
   * @property {string=} creditCardErrorUrl
   * @property {string=} creditCardCancelUrl
   * @property {string=} cofidisReturnUrl
   * @property {string=} payByLinkSuccessUrl
   * @property {string=} payByLinkErrorUrl
   * @property {string=} payByLinkCancelUrl
   * @property {string=} payByLinkBtnCloseUrl
   * @property {string=} payByLinkBtnCloseLabel
   * @property {boolean=} payByLinkOtp
   * @property {'pt'|'en'|'es'|'fr'=} language
   * @property {typeof fetch=} fetch
   */

  /**
   * @typedef {Object} Payment
   * @property {string} amount
   * @property {string} orderId
   * @property {'pending'} status
   * @property {string} createdAt
   * @property {string=} transactionId
   * @property {string=} entity
   * @property {string=} reference
   * @property {string=} paymentUrl
   * @property {string=} qrCodeValue
   * @property {string=} mobileNumber
   * @property {string=} expiresAt
   */

  function IfthenpayError(message, details) {
    this.name = 'IfthenpayError';
    this.message = message;
    this.details = details;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, IfthenpayError);
    }
  }
  IfthenpayError.prototype = Object.create(Error.prototype);
  IfthenpayError.prototype.constructor = IfthenpayError;

  function ValidationError(message, details) {
    IfthenpayError.call(this, message, details);
    this.name = 'IfthenpayValidationError';
  }
  ValidationError.prototype = Object.create(IfthenpayError.prototype);
  ValidationError.prototype.constructor = ValidationError;

  function ApiError(message, details) {
    IfthenpayError.call(this, message, details);
    this.name = 'IfthenpayApiError';
  }
  ApiError.prototype = Object.create(IfthenpayError.prototype);
  ApiError.prototype.constructor = ApiError;

  function createClient(options) {
    var config = options || {};
    var fetchImpl = config.fetch || global.fetch;
    if (typeof fetchImpl !== 'function') {
      throw new ValidationError('A browser fetch implementation is required.');
    }

    return {
      mbway: {
        createPayment: function createMbWayPayment(request) {
          return createMbWay(config, fetchImpl, request);
        },
      },
      multibanco: {
        createPayment: function createMultibancoPayment(request) {
          return createMultibanco(config, fetchImpl, request);
        },
      },
      payshop: {
        createPayment: function createPayshopPayment(request) {
          return createPayshop(config, fetchImpl, request);
        },
      },
      pix: {
        createPayment: function createPixPayment(request) {
          return createPix(config, fetchImpl, request);
        },
      },
      creditCard: {
        createPayment: function createCreditCardPayment(request) {
          return createCreditCard(config, fetchImpl, request);
        },
      },
      cofidis: {
        createPayment: function createCofidisPayment(request) {
          return createCofidis(config, fetchImpl, request);
        },
      },
      payByLink: {
        createPayment: function createPayByLinkPayment(request) {
          return createPayByLink(config, fetchImpl, request);
        },
      },
    };
  }

  function createMbWay(config, fetchImpl, request) {
    request = request || {};
    return fetchConfig(fetchImpl, requireConfig(config.authToken, 'authToken')).then(function(account) {
      var body = compact({
        mbWayKey: validateKey(requireAccountKey(account.singlePaymentAccounts, 'MBWAY'), 'mbWayKey'),
        orderId: validateOrderId(request.orderId),
        amount: validateAmountMaxLength(normalizeAmount(request.amount)),
        mobileNumber: validateMobileNumber(request.mobileNumber),
        email: validateEmail(request.email, 'email', true),
        description: validateMaxLength(account.gatewayDescription, 'description', 100),
      });
      return requestJson(fetchImpl, ENDPOINTS.mbwayInit, body).then(function then(response) {
        assertRecord(response, 'MB WAY payment request returned unexpected response.');
        assertSuccess(readString(response, 'Status'), '000', 'MB WAY payment request returned an error response.', response);
        return {
          amount: String(readNumber(response, 'Amount')),
          orderId: readString(response, 'OrderId', 'orderId'),
          transactionId: readString(response, 'RequestId'),
          mobileNumber: request.mobileNumber,
          status: 'pending',
          createdAt: new Date().toISOString(),
          expiresAt: addMinutes(4),
        };
      });
    });
  }

  function createMultibanco(config, fetchImpl, request) {
    request = request || {};
    return fetchConfig(fetchImpl, requireConfig(config.authToken, 'authToken')).then(function(account) {
      var mbKey = account.singlePaymentAccounts['MB'];
      if (mbKey && /^[A-Z]{3}-\d{6}$/.test(mbKey)) {
        var daysToExpire = validateMultibancoExpireDays(account.expiryDays);
        var body = compact({
          mbKey: validateKey(mbKey, 'multibancoDynamicKey'),
          orderId: validateOrderId(request.orderId),
          amount: validateAmountMaxLength(normalizeAmount(request.amount)),
          description: validateMaxLength(account.gatewayDescription, 'description', 255),
          expiryDays: daysToExpire,
        });
        return requestJson(fetchImpl, ENDPOINTS.multibancoInit, body).then(function then(response) {
          assertRecord(response, 'Multibanco payment request returned unexpected response.');
          assertSuccess(readString(response, 'Status'), '0', 'Multibanco payment request returned an error response.', response);
          var payment = {
            amount: String(readNumber(response, 'Amount')),
            orderId: readString(response, 'OrderId'),
            entity: readString(response, 'Entity'),
            reference: readString(response, 'Reference'),
            transactionId: readString(response, 'RequestId'),
            status: 'pending',
            createdAt: new Date().toISOString(),
          };
          if (daysToExpire !== undefined) {
            payment.expiresAt = addDays(daysToExpire);
          }
          return payment;
        });
      }
      var mb = requireOfflineMultibancoAccount(account.singlePaymentAccounts);
      var orderId = validateMultibancoOfflineOrderId(request.orderId, mb.subEntity);
      var amount = validateAmountMaxLength(normalizeAmount(request.amount));
      return {
        amount: amount,
        orderId: orderId,
        entity: mb.entity,
        reference: referenceFromOfflineMultibanco(orderId, amount, mb.entity, mb.subEntity),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
    });
  }

  function createPayshop(config, fetchImpl, request) {
    request = request || {};
    return fetchConfig(fetchImpl, requireConfig(config.authToken, 'authToken')).then(function(account) {
      var daysToExpire = validateDaysToExpire(account.expiryDays, 'daysToExpire');
      var body = compact({
        payshopkey: validateKey(requireAccountKey(account.singlePaymentAccounts, 'PAYSHOP'), 'payshopKey'),
        id: validateOrderId(request.orderId),
        valor: validateAmountMaxLength(normalizeAmount(request.amount)),
        validade: daysToExpire === undefined ? undefined : futureDateYmd(daysToExpire),
      });
      return requestJson(fetchImpl, ENDPOINTS.payshopInit, body).then(function then(response) {
        assertRecord(response, 'Payshop payment request returned unexpected response.');
        assertSuccess(readString(response, 'Code'), '0', 'Payshop payment request returned an error response.', response);
        var payment = {
          amount: normalizeAmount(request.amount),
          orderId: request.orderId,
          transactionId: readString(response, 'RequestId'),
          reference: readString(response, 'Reference'),
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
        if (daysToExpire !== undefined) {
          payment.expiresAt = addDays(daysToExpire + 1);
        }
        return payment;
      });
    });
  }

  function createPix(config, fetchImpl, request) {
    request = request || {};
    return fetchConfig(fetchImpl, requireConfig(config.authToken, 'authToken')).then(function(account) {
      var key = validateKey(requireAccountKey(account.singlePaymentAccounts, 'PIX'), 'pixKey');
      var body = compact({
        orderId: validateOrderId(request.orderId),
        amount: validateAmountMaxLength(normalizeAmount(request.amount)),
        customerCPF: validateCpf(request.cpf),
        customerName: validateMaxLength(validateRequiredString(request.name, 'name'), 'name', 150),
        customerEmail: validateEmail(request.email, 'email'),
        customerPhone: validateMobileNumber(request.mobileNumber),
        redirectUrl: validateUrl(request.redirectUrl, 'redirectUrl', 200),
        description: validateMaxLength(account.gatewayDescription, 'description', 100),
      });
      return requestJson(fetchImpl, ENDPOINTS.pixInit + key, body).then(function then(response) {
        assertRecord(response, 'PIX payment request returned unexpected response.');
        assertSuccess(readString(response, 'status'), '0', 'PIX payment request returned an error response.', response);
        return {
          amount: normalizeAmount(request.amount),
          orderId: request.orderId,
          transactionId: readString(response, 'requestId'),
          paymentUrl: readString(response, 'paymentUrl'),
          qrCodeValue: readString(response, 'qrCodeValue'),
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
      });
    });
  }

  function createCreditCard(config, fetchImpl, request) {
    request = request || {};
    return fetchConfig(fetchImpl, requireConfig(config.authToken, 'authToken')).then(function(account) {
      var key = validateKey(requireAccountKey(account.singlePaymentAccounts, 'CCARD'), 'creditCardKey');
      var body = compact({
        orderId: validateOrderId(request.orderId),
        amount: validateAmountMaxLength(normalizeAmount(request.amount)),
        successUrl: validateUrl(request.successUrl || config.creditCardSuccessUrl, 'successUrl', 200, true),
        errorUrl: validateUrl(request.errorUrl || config.creditCardErrorUrl, 'errorUrl', 200, true),
        cancelUrl: validateUrl(request.cancelUrl || config.creditCardCancelUrl, 'cancelUrl', 200, true),
        language: validateLanguage(request.language || config.language),
      });
      return requestJson(fetchImpl, ENDPOINTS.creditCardInit + key, body).then(function then(response) {
        assertRecord(response, 'Credit card payment request returned unexpected response.');
        assertSuccess(readString(response, 'Status'), '0', 'Credit card payment request returned an error response.', response);
        return {
          amount: normalizeAmount(request.amount),
          orderId: request.orderId,
          transactionId: readString(response, 'RequestId'),
          paymentUrl: readString(response, 'PaymentUrl'),
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
      });
    });
  }

  function createCofidis(config, fetchImpl, request) {
    request = request || {};
    var data = request.customerData || {};
    return fetchConfig(fetchImpl, requireConfig(config.authToken, 'authToken')).then(function(account) {
      var key = validateKey(requireAccountKey(account.singlePaymentAccounts, 'COFIDIS'), 'cofidisKey');
      var body = compact({
        orderId: validateOrderId(request.orderId),
        amount: validateAmountMaxLength(normalizeAmount(request.amount)),
        returnUrl: validateUrl(
          request.returnUrl || requireConfig(config.cofidisReturnUrl, 'cofidisReturnUrl'),
          'returnUrl',
          200,
        ),
        description: validateMaxLength(account.gatewayDescription, 'description', 100),
        customerName: validateMaxLength(data.name || '', 'customerName', 100),
        customerVat: validateMaxLength(data.vat || '', 'customerVat', 20),
        customerEmail: validateEmail(data.email || '', 'customerEmail', true),
        customerPhone: validateMaxLength(data.phone || '', 'customerPhone', 15),
        billingAddress: validateMaxLength(data.billingAddress || '', 'billingAddress', 150),
        billingZipCode: validateMaxLength(data.billingZipCode || '', 'billingZipCode', 20),
        billingCity: validateMaxLength(data.billingCity || '', 'billingCity', 50),
        deliveryAddress: validateMaxLength(data.deliveryAddress || '', 'deliveryAddress', 150),
        deliveryZipCode: validateMaxLength(data.deliveryZipCode || '', 'deliveryZipCode', 20),
        deliveryCity: validateMaxLength(data.deliveryCity || '', 'deliveryCity', 50),
      });
      return requestJson(fetchImpl, ENDPOINTS.cofidisInit + key, body).then(function then(response) {
        assertRecord(response, 'Cofidis payment request returned unexpected response.');
        assertSuccess(readString(response, 'status'), '0', 'Cofidis payment request returned an error response.', response);
        return {
          amount: normalizeAmount(request.amount),
          orderId: request.orderId,
          transactionId: readString(response, 'requestId'),
          paymentUrl: readString(response, 'paymentUrl'),
          status: 'pending',
          createdAt: new Date().toISOString(),
        };
      });
    });
  }

  function createPayByLink(config, fetchImpl, request) {
    request = request || {};
    return fetchConfig(fetchImpl, requireConfig(config.authToken, 'authToken')).then(function(account) {
      var key = validateGatewayKey(account.gatewayKey, 'payByLinkKey');
      var daysToExpire = validateDaysToExpire(account.expiryDays, 'daysToExpire');
      var successUrl = request.successUrl || config.payByLinkSuccessUrl;
      var otp = request.otp !== undefined ? request.otp : config.payByLinkOtp;
      var body = compact({
        id: validateOrderId(request.orderId),
        amount: validateAmountMaxLength(normalizeAmount(request.amount)),
        description: validateMaxLength(account.gatewayDescription, 'description', 200),
        accounts: validateMethodAccounts(
          methodAccountsToString(request.methodAccounts || account.accountKeysRaw),
        ),
        selected_method: account.paymentData,
        expiredate: daysToExpire === undefined ? undefined : futureDateYmd(daysToExpire + 1),
        successUrl: successUrl
          ? appendQuery(validateUrl(successUrl, 'successUrl', 2000, true), { tid: '[TRANSACTIONID]' })
          : undefined,
        errorUrl: validateUrl(request.errorUrl || config.payByLinkErrorUrl, 'errorUrl', 2000, true),
        cancelUrl: validateUrl(request.cancelUrl || config.payByLinkCancelUrl, 'cancelUrl', 2000, true),
        btnCloseUrl: validateUrl(request.closeButtonUrl || config.payByLinkBtnCloseUrl, 'closeButtonUrl', 2000, true),
        btnCloseLabel: validateMaxLength(
          request.closeButtonLabel || config.payByLinkBtnCloseLabel,
          'closeButtonLabel',
          50,
        ),
        otp: validateBoolean(otp, 'otp') ? 'true' : 'false',
        language: validateLanguage(request.language || config.language),
      });
      return requestJson(fetchImpl, ENDPOINTS.payByLinkInit + key, body).then(function then(response) {
        assertRecord(response, 'Pay by Link payment request returned unexpected response.');
        return {
          amount: normalizeAmount(request.amount),
          orderId: request.orderId,
          transactionId: readString(response, 'PinCode'),
          paymentUrl: readString(response, 'PinpayUrl'),
          status: 'pending',
          createdAt: new Date().toISOString(),
          expiresAt: daysToExpire === undefined ? undefined : addDays(daysToExpire),
        };
      });
    });
  }

  function requestJson(fetchImpl, url, body) {
    return fetchImpl(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify(body),
    }).then(function parseResponse(response) {
      return response.text().then(function parseText(text) {
        var data = parseJsonOrText(text);
        if (!response.ok) {
          throw new ApiError('Ifthenpay API request failed.', {
            status: response.status,
            response: data,
          });
        }
        return data;
      });
    });
  }

  function fetchConfig(fetchImpl, authToken) {
    return fetchImpl('https://api.ifthenpay.com/v2/cmsintegration/get/' + authToken + '/itpconnect', {
      method: 'POST',
      headers: { accept: 'application/json' },
    }).then(function parseResponse(response) {
      return response.text().then(function parseText(text) {
        var data = parseJsonOrText(text);
        if (!response.ok) {
          throw new ApiError('Failed to fetch Ifthenpay configuration.', {
            status: response.status,
            response: data,
          });
        }
        assertRecord(data, 'Ifthenpay configuration request returned unexpected response.');
        var accountKeysRaw = readString(data, 'accountKeys');
        var accountKeys = {};
        accountKeysRaw
          .replace(/\s+/g, '')
          .toUpperCase()
          .replace(/;$/, '')
          .split(';')
          .forEach(function parseEntry(entry) {
            var idx = entry.indexOf('|');
            if (idx !== -1) {
              accountKeys[entry.slice(0, idx)] = entry.slice(idx + 1);
            }
          });
        var singlePaymentAccounts = {};
        var jsonDataField = data.jsonData;
        if (typeof jsonDataField === 'string') {
          try { jsonDataField = JSON.parse(jsonDataField); } catch (_e) { jsonDataField = null; }
        }
        if (jsonDataField && typeof jsonDataField === 'object' && !Array.isArray(jsonDataField)) {
          Object.keys(jsonDataField).forEach(function parseJsonDataEntry(key) {
            var rawValue = jsonDataField[key];
            if (rawValue) {
              var parts = String(rawValue).split('|');
              var accountKey = parts[0].replace(/\s+/g, '').toUpperCase();
              var accountValue = parts[parts.length - 1].replace(/\s+/g, '');
              singlePaymentAccounts[accountKey] = accountValue;
            }
          });
        }
        var paymentDataStr = readString(data, 'paymentData');
        var paymentDataMatch = paymentDataStr.match(/\d+/);
        var resolvedConfig = {
          accountKeys: accountKeys,
          accountKeysRaw: accountKeysRaw,
          singlePaymentAccounts: singlePaymentAccounts,
          expiryDays: readNumber(data, 'expiryDays'),
          gatewayKey: readString(data, 'gatewayKey'),
          gatewayDescription: readString(data, 'gatewayDescription'),
          paymentData: paymentDataMatch ? paymentDataMatch[0] : undefined,
        };
        return resolvedConfig;
      });
    });
  }

  function requireAccountKey(accountKeys, method) {
    var key = accountKeys[method];
    if (!key) {
      throw new ValidationError(
        method + ' payment method is not configured for this account.',
        { field: 'accountKeys' },
      );
    }
    return key;
  }

  function requireOfflineMultibancoAccount(accountKeys) {
    var entity = Object.keys(accountKeys).filter(function(k) {
      return /^\d{5}$/.test(k);
    })[0];
    if (!entity) {
      throw new ValidationError(
        'Multibanco offline is not configured for this account.',
        { field: 'accountKeys' },
      );
    }
    return { entity: entity, subEntity: accountKeys[entity] };
  }

  function parseJsonOrText(text) {
    if (!text) {
      return undefined;
    }
    try {
      return JSON.parse(text);
    } catch (_error) {
      return text;
    }
  }

  function requireConfig(value, field) {
    if (!value) {
      throw new ValidationError(field + ' is required.', { field: field });
    }
    return value;
  }

  function validateRequiredString(value, field) {
    if (typeof value !== 'string' || value === '') {
      throw new ValidationError(field + ' is required.', { field: field });
    }
    return value;
  }

  function validateMaxLength(value, field, maxLength) {
    if (value === undefined || value === '') {
      return value;
    }
    if (typeof value !== 'string') {
      throw new ValidationError(field + ' must be a string.', { field: field });
    }
    if (value.length > maxLength) {
      throw new ValidationError(
        field + ' length must be equal or less than ' + maxLength + ' characters.',
        { field: field },
      );
    }
    return value;
  }

  function validatePattern(value, field, pattern, message) {
    if (!pattern.test(value)) {
      throw new ValidationError(message, { field: field });
    }
    return value;
  }

  function validateKey(value, field) {
    return validatePattern(
      validateRequiredString(value, field),
      field,
      /^[A-Z]{3}-\d{6}$/,
      field + ' must be a valid key in the format ITP-000000.',
    );
  }

  function validateGatewayKey(value, field) {
    return validatePattern(
      validateRequiredString(value, field),
      field,
      /^[A-Z]{4}-\d{6}$/,
      field + ' must be a valid gateway key in the format AAAA-000000.',
    );
  }

  function normalizeAmount(amount) {
    if (typeof amount === 'number') {
      if (!isFinite(amount) || amount <= 0) {
        throw new ValidationError('amount must be greater than zero.', { field: 'amount' });
      }
      return amount.toFixed(2);
    }
    if (typeof amount !== 'string' || !/^\d+\.\d{2}$/.test(amount) || Number(amount) <= 0) {
      throw new ValidationError(
        'amount must be a positive decimal number with "." as separator and two decimal places.',
        { field: 'amount' },
      );
    }
    return amount;
  }

  function validateAmountMaxLength(amount) {
    if (amount.length > 10) {
      throw new ValidationError('amount length must be equal or less than 10 characters.', {
        field: 'amount',
      });
    }
    return amount;
  }

  function validateOrderId(orderId) {
    return validateMaxLength(validateRequiredString(orderId, 'orderId'), 'orderId', 15);
  }

  function validateMultibancoOfflineOrderId(orderId, subEntity) {
    if (subEntity.length >= 7) {
      return '';
    }
    var maxOrderIdLength = 7 - subEntity.length;
    return validateMaxLength(validateRequiredString(orderId, 'orderId'), 'orderId', maxOrderIdLength);
  }

  function validateMobileNumber(mobileNumber) {
    var normalizedMobileNumber = validateRequiredString(mobileNumber, 'mobileNumber').replace(/[^\d#]/g, '');
    return validatePattern(
      normalizedMobileNumber,
      'mobileNumber',
      /^\d+#\d+$/,
      'mobileNumber must be a valid mobile number in the format countryCode#phoneNumber (e.g. 351#912345678).',
    );
  }

  function validateEmail(email, field, isOptional) {
    field = field || 'email';
    if (email === undefined || email === '') {
      if (isOptional) return email;
      throw new ValidationError(field + ' is required.', { field: field });
    }
    validateMaxLength(email, field, 100);
    return validatePattern(email, field, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, field + ' must be a valid email address.');
  }

  function validateUrl(url, field, maxLength, isOptional) {
    if (url === undefined || url === '') {
      if (isOptional) return url;
      throw new ValidationError(field + ' is required.', { field: field });
    }
    validateMaxLength(url, field, maxLength);
    try {
      new URL(url);
    } catch (_error) {
      throw new ValidationError(field + ' must be a valid URL.', { field: field });
    }
    return url;
  }

  function validateCpf(cpf) {
    return validatePattern(
      validateRequiredString(cpf, 'cpf'),
      'cpf',
      /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
      'cpf must be a valid CPF in the format 111.111.111-11.',
    );
  }

  function validateLanguage(language) {
    if (language === undefined || language === '') {
      return language;
    }
    if (['pt', 'en', 'es', 'fr'].indexOf(language) === -1) {
      throw new ValidationError('language must be one of the following values: pt, en, es, fr.', {
        field: 'language',
      });
    }
    return language;
  }

  function validateMultibancoExpireDays(daysToExpire) {
    if (daysToExpire === undefined) {
      return daysToExpire;
    }
    if (
      !isInteger(daysToExpire) ||
      !/^(?:0|[1-9]|[1-2]\d|3[0-2]|45|60|90|120)$/.test(String(daysToExpire))
    ) {
      throw new ValidationError('daysToExpire must be an integer matching 0 to 32 or 45, 60, 90, 120.', {
        field: 'daysToExpire',
      });
    }
    return daysToExpire;
  }

  function validateDaysToExpire(daysToExpire, field) {
    if (daysToExpire === undefined) {
      return daysToExpire;
    }
    if (!isInteger(daysToExpire) || daysToExpire < 0 || daysToExpire > 365) {
      throw new ValidationError(field + ' must be an integer between 0 and 365.', { field: field });
    }
    return daysToExpire;
  }

  function validateBoolean(value, field) {
    if (value === undefined) {
      return value;
    }
    if (typeof value !== 'boolean') {
      throw new ValidationError(field + ' must be a boolean.', { field: field });
    }
    return value;
  }

  function validateMethodAccounts(accounts) {
    var normalizedAccounts = validateRequiredString(accounts, 'methodAccounts').replace(/\s+/g, '').toUpperCase();
    var methodAccountsPattern =
      /^(?:(?:\d{5}\|\d{1,7})|(?:(?:MB|MBWAY|PAYSHOP|CCARD|COFIDIS|GOOGLE|APPLE|PIX)\|[A-Z]{3}-\d{6}))(?:;(?:(?:\d{5}\|\d{1,7})|(?:(?:MB|MBWAY|PAYSHOP|CCARD|COFIDIS|GOOGLE|APPLE|PIX)\|[A-Z]{3}-\d{6})))*;?$/;
    if (!methodAccountsPattern.test(normalizedAccounts)) {
      throw new ValidationError(
        'methodAccounts must be a valid method accounts string, for example MBWAY|ITP-000000;PIX|ITP-000000.',
        { field: 'methodAccounts' },
      );
    }
    var seen = {};
    normalizedAccounts
      .replace(/;$/, '')
      .split(';')
      .forEach(function eachAccount(account) {
        var method = account.split('|')[0];
        var dedupeKey = /^\d+$/.test(method) ? 'MB' : method;
        if (seen[dedupeKey]) {
          throw new ValidationError(
            'methodAccounts has duplicate entries for payment method ' + dedupeKey + ' (' + seen[dedupeKey] + ' and ' + method + ').',
            { field: 'methodAccounts' },
          );
        }
        seen[dedupeKey] = method;
      });
    return normalizedAccounts;
  }

  function methodAccountsToString(accounts) {
    if (typeof accounts === 'string') {
      return accounts;
    }
    if (!accounts || Object.keys(accounts).length === 0) {
      throw new ValidationError('methodAccounts are required.', { field: 'methodAccounts' });
    }
    return Object.keys(accounts)
      .map(function mapAccount(method) {
        return method + '|' + accounts[method];
      })
      .join(';');
  }

  function compact(payload) {
    var result = {};
    Object.keys(payload).forEach(function eachKey(key) {
      if (payload[key] !== undefined) {
        result[key] = payload[key];
      }
    });
    return result;
  }

  function appendQuery(url, query) {
    var parsed = new URL(url);
    Object.keys(query).forEach(function eachKey(key) {
      parsed.searchParams.set(key, query[key]);
    });
    return parsed.toString();
  }

  function addDays(days) {
    var date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(23, 59, 0, 0);
    return date.toISOString();
  }

  function addMinutes(minutes) {
    return new Date(Date.now() + minutes * 60000).toISOString();
  }

  function futureDateYmd(days) {
    var date = new Date();
    date.setDate(date.getDate() + days);
    return String(date.getFullYear()) + pad2(date.getMonth() + 1) + pad2(date.getDate());
  }

  function referenceFromOfflineMultibanco(orderId, amount, entity, subEntity) {
    var amountCents = parseInt(amount.replace('.', ''), 10);
    var paddedOrderId = '0000' + orderId;
    var effectiveSubEntity = subEntity.length > 7 ? subEntity.slice(0, 7) : subEntity;
    var seedLength = 7 - effectiveSubEntity.length;
    var seed = seedLength > 0 ? paddedOrderId.slice(-seedLength) : '';
    var checkString =
      padLeft(entity, 5) + effectiveSubEntity + padLeft(seed, seedLength) + padLeft(String(amountCents), 8);
    var checkArray = [3, 30, 9, 90, 27, 76, 81, 34, 49, 5, 50, 15, 53, 45, 62, 38, 89, 17, 73, 51];
    var checkValue = 0;
    var index;
    for (index = 0; index < 20; index += 1) {
      checkValue += (Number(checkString.charAt(19 - index)) % 10) * checkArray[index];
    }
    return effectiveSubEntity + seed + padLeft(String(98 - (checkValue % 97)), 2);
  }

  function assertRecord(value, message) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new ApiError(message, { response: value });
    }
  }

  function assertSuccess(status, successStatus, message, response) {
    if (status !== successStatus) {
      throw new ApiError(message, { response: response });
    }
  }

  function readString(value, key, fallback) {
    var raw = value[key];
    if (raw === undefined && fallback) {
      raw = value[fallback];
    }
    if (typeof raw === 'string' || typeof raw === 'number') {
      return String(raw);
    }
    throw new ApiError('Response is missing ' + key + '.', { response: value });
  }

  function readNumber(value, key) {
    var raw = value[key];
    if (typeof raw === 'number') {
      return raw;
    }
    if (typeof raw === 'string' && raw !== '') {
      return Number(raw);
    }
    throw new ApiError('Response is missing ' + key + '.', { response: value });
  }

  function isInteger(value) {
    return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
  }

  function pad2(value) {
    return padLeft(String(value), 2);
  }

  function padLeft(value, length) {
    while (value.length < length) {
      value = '0' + value;
    }
    return value;
  }

  var Ifthenpay = {
    createClient: createClient,
    IfthenpayError: IfthenpayError,
    ValidationError: ValidationError,
    ApiError: ApiError,
    version: '1.0.0',
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = Ifthenpay;
  } else {
    global.Ifthenpay = Ifthenpay;
  }
})(typeof window !== 'undefined' ? window : globalThis);
