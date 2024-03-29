'use strict';
var Enum = require('./enum.js');
var utils = {};

var convertAccount = function(dbObject) {
    if (dbObject) {
        let res = {};
        res._id = dbObject._id;
        res.accountId = dbObject.accountId;
        res.accountName = dbObject.accountName;
        res.accountType = dbObject.accountType;
        res.email = dbObject.email;
        res.password = dbObject.password;
        return res;
    }
    return dbObject;
};

var convertAnswer = function(dbObject) {
    if (dbObject) {
        let res = {};
        res._id = dbObject._id;
        res.accountId = dbObject.accountId;
        res.lastUpdatedDate = dbObject.lastUpdatedDate;
        res.answers = dbObject.answers;
        res.questionSetId = dbObject.questionSetId;
        res.isCollaborative = dbObject.isCollaborative;
        res.currentGiveUpNumber = dbObject.currentGiveUpNumber;
        res.isSubmitted = dbObject.isSubmitted;
        return res;
    }
    return dbObject;
};

var convertSession = function(dbObject) {
    if (dbObject) {
        let res = {};
        res._id = dbObject._id;
        res.accountAId = dbObject.accountAId;
        res.accountBId = dbObject.accountBId;
        res.accountAName = dbObject.accountAName;
        res.accountBName = dbObject.accountBName;
        res.questionSetId = dbObject.questionSetId;
        res.messages = dbObject.messages;
        res.lastUpdatedDate = dbObject.lastUpdatedDate;
        res.currentGiveUpNumber = dbObject.currentGiveUpNumber;
        return res;
    }
    return dbObject;
};

var convertHint = function(dbObject) {
    if (dbObject) {
        let res = {};
        res._id = dbObject._id;
        res.accountId = dbObject.accountId;
        res.lastUpdatedDate = dbObject.lastUpdatedDate;
        res.questionSetId = dbObject.questionSetId;
        res.isA = dbObject.isA;
        res.hints = [];
        for (let individualHint of dbObject.hints) {
            let newHint = {};
            newHint.questionId = individualHint.questionId;
            newHint.createdDate = individualHint.createdDate;
            newHint.selectedHints = [];
            if (individualHint.selectedHints.length) {
                newHint.selectedHints = individualHint.selectedHints[individualHint.selectedHints.length - 1];
            }
            res.hints.push(newHint);
        }
        res.currentGiveUpNumber = dbObject.currentGiveUpNumber;
        return res;
    }
    return dbObject;
};

var convertAction = function(dbObject) {
    if (dbObject) {
        let res = {};
        res._id = dbObject._id;
        res.accountId = dbObject.accountId;
        res.accountName = dbObject.accountName;
        res.questionSetId = dbObject.questionSetId;
        res.actionItems = dbObject.actionItems;
        return res;
    }
    return dbObject;
};

var convert = function(dbObject, schemaType) {
    if (schemaType) {
        if (schemaType === Enum.schemaType.account) {
            return convertAccount(dbObject);
        } else if (schemaType === Enum.schemaType.answer) {
            return convertAnswer(dbObject);
        } else if (schemaType === Enum.schemaType.session) {
            return convertSession(dbObject);
        } else if (schemaType === Enum.schemaType.hint) {
            return convertHint(dbObject);
        } else if (schemaType === Enum.schemaType.action) {
            return convertAction(dbObject);
        }
    }
    return dbObject;
}

utils.convertToFrontEndObject = function(dbObjects, schemaType) {
    if (Array.isArray(dbObjects)) {
        let res = [];
        for (let obj of dbObjects) {
            res.push(convert(obj, schemaType));
        }
        return res;
    } else {
        return convert(dbObjects, schemaType);
    }
};

module.exports = utils;
