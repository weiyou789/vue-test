import { observe } from './observer';
import { noop, warn, isPlainObject, isFunction, bind } from './utils';

const sharedPropertyDefinition = {
    enumerable: true,
    configurable: true,
    get: noop,
    set: noop
}

export function initData(wm,data){
    if(isFunction(data)){
        data = data();
    }
    observe(data,true);
    wm.$data = data;
    const keys = Object.keys(data);
    let i = keys.length;
    while (i--){
        proxy(wm,'$data',keys[i])
    }

}

export function initMethods(vm, methods) {
    //遍历到原型链属性
    for (const key in methods) {
        vm[key] = methods[key] == null ? noop : bind(methods[key], vm)
    }
}

function proxy(target, sourceKey, key) {
    sharedPropertyDefinition.get = function proxyGetter() {
        return this[sourceKey][key]
    }
    sharedPropertyDefinition.set = function proxySetter(val) {
        this[sourceKey][key] = val
    }
    Object.defineProperty(target, key, sharedPropertyDefinition)
}