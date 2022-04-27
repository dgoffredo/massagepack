const msgpack = require('msgpack-lite');
// "BE" = "big endian", "LE" = "little endian"
const {Int64BE, Uint64BE, Int64LE, Uint64LE} = require("int64-buffer");

const msgpackCodec = msgpack.createCodec({int64: true});

function msgpackEncode(value) {
    return msgpack.encode(value, {codec: msgpackCodec});
}

function msgpackDecode(buffer) {
    return msgpack.decode(buffer, {codec: msgpackCodec});
}

// https://stackoverflow.com/a/52657830
function isPlainObject(obj) {
    return obj.constructor === Object && Object.getPrototypeOf(obj) === Object.prototype;
}

function identity(value) {
    return value;
}

function transform(value, handlers) {
    const {
    onSpecialObject = identity,
    onBigInt = identity
    } = handlers;

    switch (typeof value) {
    case 'string':
    case 'null':
    case 'undefined':
    case 'boolean':
    case 'number':
        return value;
    case 'bigint':
        return onBigInt(value);
    case 'object':
        break;  // handled below
    default:
        throw Error(`unsupported typeof value === ${JSON.stringify(typeof value)} for value: ${value}`);
    }

    if (isPlainObject(value)) {
        return Object.fromEntries(
            Object.entries(value).map(
                ([key, value]) => [key, transform(value, handlers)]));
    }

    if (Array.isArray(value)) {
        return value.map(value => transform(value, handlers));
    }

    return onSpecialObject(value);
}

function bigIntToInt64BE(value) {
    if (value < 0) {
        return new Int64BE(value.toString(), 10);
    } else {
        return new Uint64BE(value.toString(), 10);
    }
}

function encode(value) {
    const int64ified = transform(value, {onBigInt: bigIntToInt64BE});
    return msgpackEncode(int64ified);
}

function isInt64(value) {
    return [
        Int64BE.isInt64BE,
        Uint64BE.isUint64BE,
        Int64LE.isInt64LE,
        Uint64LE.isUint64LE
    ].some(predicate => predicate(value));
}

function int64ToBigInt(value) {
    return BigInt(value.toString());
}

function decode(buffer) {
    const raw = msgpackDecode(buffer);
    return transform(raw, {
        onSpecialObject: function (value) {
            if (isInt64(value)) {
                return int64ToBigInt(value);
            } else {
                return value;
            }
        }
    });
}

function encodeJSON(value) {
    switch (typeof value) {
    case 'string':
    case 'null':
    case 'undefined':
    case 'boolean':
    case 'number':
        return JSON.stringify(value);
    case 'bigint':
        return value.toString();
    }

    if (isPlainObject(value)) {
        return '{' + Object.entries(value).map(
            ([key, value]) => JSON.stringify(key) + ':' + encodeJSON(value)).join(',') + 
        '}';
    }

    if (Array.isArray(value)) {
        return '[' + value.map(value => encodeJSON(value)).join(',') + ']';
    }

    return JSON.stringify(value);
}

module.exports = {
    encode,
    decode,
    encodeJSON
};
