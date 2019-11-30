'use strict';
var Enum = require('./enum.js');
var utils = {};
var crypto = require('crypto'),
    algorithm = 'aes-256-ctr',
    password = 'abcd1234';

// no password
var convertAccount = function(dbObject) {
    if (dbObject) {
        let res = {};
        res.accountId = dbObject.accountId;
        res.accountName = dbObject.accountName;
        res.accountType = dbObject.accountType;
        res.email = dbObject.email;
        return res;
    }
    return dbObject;
};

var convertAnswer = function(dbObject) {
    if (dbObject) {
        let res = {};
        res.questionId = dbObject.questionId;
        res.answer = dbObject.answer;
        res.accountId = dbObject.accountId;
        res.lastUpdatedDate = dbObject.lastUpdatedDate;
        res.questionSetId = dbObject.questionSetId;
        return res;
    }
    return dbObject;
};

var convertQuestion = function(dbObject, withAnswer) {
    if (dbObject) {
        let res = {};
        res.questionType = dbObject.questionType;
        res.question = dbObject.question;
        if (withAnswer) {
            res.defaultAnswer = dbObject.defaultAnswer;
        }
        return res;
    }
    return dbObject;
};

var convert = function(dbObject, schemaType) {
    if (schemaType) {
        if (schemaType === Enum.schemaType.account) {
            return convertAccount(dbObject);
        } else if (schemaType === Enum.schemaType.question) {
            return convertQuestion(dbObject);
        } else if (schemaType === Enum.schemaType.answer) {
            return convertAnswer(dbObject);
        }
    }
    return dbObject;
}

utils.convertToFrontEndObject = function(dbObjects, schemaType) {
    if (Array.isArray(dbObject)) {
        let res = [];
        for (let obj of dbObject) {
            res.push(convert(obj, schemaType));
        }
        return res;
    } else {
        return convert(dbObjects, schemaType);
    }
};

utils.encryptPassword = function(pw) {
    var cipher = crypto.createCipher(algorithm, password);
    var crypted = cipher.update(pw, 'utf8', 'hex');
    crypted += cipher.final('hex');
    return crypted;
}

utils.decryptPassword = function(dbPw) {
    var decipher = crypto.createDecipher(algorithm, password);
    var decrypted = decipher.update(dbPw, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = utils;
