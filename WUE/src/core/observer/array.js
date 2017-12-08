import { def } from '../utils'
//覆盖数组原生方法，当调用数组方法时，如果是添加值，为添加的值添加监听者，并设置getter/setter
const arrayProto = Array.prototype
export const arrayMethods = Object.create(arrayProto);
//覆盖数组原生方法，触发notify();
[
    'push',
    'pop',
    'shift',
    'unshift',
    'splice',
    'sort',
    'reverse'
].forEach(function (method) {
    const original = arrayProto[method]
    def(arrayMethods, method, function mutator() {
        let i = arguments.length
        const args = new Array(i)
        while (i--) {
            args[i] = arguments[i]
        }
        const result = original.apply(this, args)
        //console.log(this);
        const ob = this.__ob__
        let inserted
        //如果添加值，为添加的值添加监听者
        switch (method) {
            case 'push':
                inserted = args
                break
            case 'unshift':
                inserted = args
                break
            case 'splice':
                inserted = args.slice(2)
                break
        }
        //if (inserted) ob.observeArray(inserted)
        ob.dep.notify()
        return result
    })
})
