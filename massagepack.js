const msgpack = require('msgpack-lite');
// "BE" = "big endian", "LE" = "little endian"
const {Int64BE, Uint64BE, Int64LE, Uint64LE} = require("int64-buffer");


function msgpackEncode(value, options) {
    const msgpackCodec = msgpack.createCodec({int64: true, ...options});
    return msgpack.encode(value, {codec: msgpackCodec});
}

function msgpackDecode(buffer, options) {
    const msgpackCodec = msgpack.createCodec({int64: true, ...options});
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

    if (value instanceof Map) {
        return new Map(Array.from(value.entries()).map(([key, value]) => [key, transform(value, handlers)]));
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

function encode(value, options = {}) {
    const int64ified = transform(value, {onBigInt: bigIntToInt64BE});
    return msgpackEncode(int64ified, options);
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

function decode(buffer, options = {}) {
    const raw = msgpackDecode(buffer, options);
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

    if (value instanceof Map) {
        return encodeJSON(Object.fromEntries(value.entries()));
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
