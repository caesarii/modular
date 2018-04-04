

class Type {
    static isType (type) {
        return function (obj) {
            return {}.toString.call(obj) === '[object ' + type + ']'
        }
    }
    static isObject(obj) {
        return Type.isType('Object')(obj)
    }
    
    static isString(obj) {
        return Type.isType('String')(obj)
    }
    static isArray(obj) {
        return Array.isArray(obj) || (Type.isType('Array')(obj))
    }
    static isFunction(obj) {
        return Type.isType('Function')(obj)
    }
    static isUndefined(obj) {
        return Type.isType('Undefined')(obj)
    }
}

export default Type