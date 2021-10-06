import {
    Flux, FluxPack, freeContract, instantiateModules, instantiatePlugins, ModuleDataEmitter,
    ModuleFlux, parseGraph, Pipe, Property, renderTemplate, Runner, Schema, Context
} from "@youwol/flux-core"
import { PluginAutoForm } from "../lib/auto-form.plugin"
import { ReplaySubject } from "rxjs"
import { reduce, take } from "rxjs/operators"

console.log = () => { }

let pack = new FluxPack({ name: 'test-auto-form', version: '0' })

namespace TestModule {

    export enum operationType {
        Addition = 'addition',
        Multiplication = 'multiplication'
    }

    let factory = {
        [operationType.Addition]: (a, b) => a + b,
        [operationType.Multiplication]: (a, b) => a * b
    }

    @Schema({ pack })
    export class PersistentData {

        @Property({
            description: 'Operation',
            enum: Object.values(operationType)
        })
        operation: operationType = operationType.Addition

        constructor(params: { operation?: operationType } = {}) {
            Object.assign(this, params)
        }
    }

    @Flux({
        pack: pack,
        namespace: TestModule,
        id: "TestModule"
    })
    export class Module extends ModuleFlux {

        output$: Pipe<number>

        constructor(params) {
            super(params)
            this.output$ = this.addOutput()
            this.addInput({
                contract: freeContract(),
                onTriggered: ({ data, configuration, context }: {
                    data: [number, number],
                    configuration: PersistentData,
                    context: Context
                }) => {

                    this.output$.next({ data: factory[configuration.operation](data[0], data[1]), context })
                }
            })
        }
    }

}


test('trigger always', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '                    |~testModule~|---$obs$--',
        '|~dataEmitter~|---|~autoFormPlugin~|'
    ]

    let modules = instantiateModules({
        dataEmitter: ModuleDataEmitter,
        testModule: TestModule
    })

    let plugins = instantiatePlugins({
        autoFormPlugin: [modules.testModule, PluginAutoForm]
    })

    expect(plugins.autoFormPlugin.configuration.data.triggerPolicy)
        .toEqual(PluginAutoForm.TriggerPolicyEnum.always)

    let observers = {
        obs: new ReplaySubject(1)
    }

    let graph = parseGraph({ branches, modules, plugins, observers })

    new Runner(graph)

    let div = document.createElement('div')
    div.innerHTML = '<div id="autoFormPlugin"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(plugins))

    modules.dataEmitter.emit({ data: [1, 1] })

    observers.obs.pipe(take(1)).subscribe((data) => {
        expect(data).toEqual(2)
    })

    let options = div.querySelectorAll('option')
    expect(options.length).toEqual(2)
    expect(options[0].innerText).toEqual('addition')
    expect(options[1].innerText).toEqual('multiplication')

    let select = div.querySelector('select')
    // Not working: options[1].dispatchEvent(new MouseEvent('click')) or options[1].selected = true
    select.onchange({
        target: [{
            selected: true,
            value: TestModule.operationType.Multiplication
        }]
    } as any)

    observers.obs.pipe(take(1)).subscribe((data) => {
        expect(data).toEqual(1)
        done()
    })
    let applyDiv = div.querySelector('.auto-form-apply')
    expect(applyDiv).toBeFalsy()
})


test('trigger on apply', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '                    |~testModule~|---$obs$--',
        '|~dataEmitter~|---|~autoFormPlugin~|'
    ]

    let modules = instantiateModules({
        dataEmitter: ModuleDataEmitter,
        testModule: TestModule
    })

    let plugins = instantiatePlugins({
        autoFormPlugin: [modules.testModule, PluginAutoForm, { triggerPolicy: PluginAutoForm.TriggerPolicyEnum.applyOnly }]
    })

    expect(plugins.autoFormPlugin.configuration.data.triggerPolicy)
        .toEqual(PluginAutoForm.TriggerPolicyEnum.applyOnly)

    let observers = {
        obs: new ReplaySubject(1)
    }

    let graph = parseGraph({ branches, modules, plugins, observers })

    new Runner(graph)

    let div = document.createElement('div')
    div.innerHTML = '<div id="autoFormPlugin"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(plugins))

    modules.dataEmitter.emit({ data: [1, 1] })

    let subBeforeApply = observers.obs.subscribe((data) => {
        throw Error("Data send before 'apply'")
    })

    let options = div.querySelectorAll('option')
    expect(options.length).toEqual(2)
    expect(options[0].innerText).toEqual('addition')
    expect(options[1].innerText).toEqual('multiplication')

    let select = div.querySelector('select') as any
    select.selectedIndex = 1

    select.onchange({
        target: [{
            selected: true,
            value: TestModule.operationType.Multiplication
        }]
    } as any)

    subBeforeApply.unsubscribe()
    let applyDiv = div.querySelector('.auto-form-apply')
    applyDiv.dispatchEvent(new MouseEvent('click'))
    observers.obs.pipe(take(1)).subscribe((data) => {
        expect(data).toEqual(1)
        done()
    })
})


test('AutoForm, trigger on apply', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '                    |~testModule~|---$obs$--',
        '|~dataEmitter~|---|~autoFormPlugin~|'
    ]

    let modules = instantiateModules({
        dataEmitter: ModuleDataEmitter,
        testModule: TestModule
    })

    let plugins = instantiatePlugins({
        autoFormPlugin: [modules.testModule, PluginAutoForm, { triggerPolicy: PluginAutoForm.TriggerPolicyEnum.applyOnly }]
    })

    expect(plugins.autoFormPlugin.configuration.data.triggerPolicy)
        .toEqual(PluginAutoForm.TriggerPolicyEnum.applyOnly)

    let observers = {
        obs: new ReplaySubject(1)
    }

    let graph = parseGraph({ branches, modules, plugins, observers })

    new Runner(graph)

    let div = document.createElement('div')
    div.innerHTML = '<div id="autoFormPlugin"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(plugins))

    modules.dataEmitter.emit({ data: [1, 1] })

    let subBeforeApply = observers.obs.subscribe((data) => {
        throw Error("Data send before 'apply'")
    })


    let options = div.querySelectorAll('option')
    expect(options.length).toEqual(2)
    expect(options[0].innerText).toEqual('addition')
    expect(options[1].innerText).toEqual('multiplication')

    let select = div.querySelector('select') as any
    select.selectedIndex = 1

    select.onchange({
        target: [{
            selected: true,
            value: TestModule.operationType.Multiplication
        }]
    } as any)

    subBeforeApply.unsubscribe()
    let applyDiv = div.querySelector('.auto-form-apply')
    applyDiv.dispatchEvent(new MouseEvent('click'))
    observers.obs.pipe(take(1)).subscribe((data) => {
        expect(data).toEqual(1)
        done()
    })
})


test('with default values', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '                    |~testModule~|---$obs$--',
        '|~dataEmitter~|---|~autoFormPlugin~|'
    ]

    let modules = instantiateModules({
        dataEmitter: ModuleDataEmitter,
        testModule: TestModule
    })

    let plugins = instantiatePlugins({
        autoFormPlugin: [modules.testModule, PluginAutoForm, {
            triggerPolicy: PluginAutoForm.TriggerPolicyEnum.always,
            defaultValues: () => ({ operation: TestModule.operationType.Multiplication })
        }]
    })

    let observers = {
        obs: new ReplaySubject(1)
    }
    let graph = parseGraph({ branches, modules, plugins, observers })

    new Runner(graph)

    let div = document.createElement('div')
    div.innerHTML = '<div id="autoFormPlugin"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(plugins))

    modules.dataEmitter.emit({ data: [1, 1] })

    observers.obs.pipe(take(1)).subscribe((data) => {
        expect(data).toEqual(1)
        done()
    })
})


test('with default data', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '    |~testModule~|---$obs$--',
        '--|~autoFormPlugin~|'
    ]

    let modules = instantiateModules({
        testModule: TestModule
    })

    let plugins = instantiatePlugins({
        autoFormPlugin: [modules.testModule, PluginAutoForm, {
            triggerPolicy: PluginAutoForm.TriggerPolicyEnum.always,
            defaultData: () => {
                return [2, 2]
            }
        }]
    })

    let observers = {
        obs: new ReplaySubject(1)
    }
    let graph = parseGraph({ branches, modules, plugins, observers })

    new Runner(graph)

    observers.obs.pipe(take(1)).subscribe((data) => {
        expect(data).toEqual(4)
        done()
    })
})


test('always trigger: make sure when new data reach the module the current conf is not changed', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '                    |~testModule~|---$obs$--',
        '|~dataEmitter~|---|~autoFormPlugin~|'
    ]

    let modules = instantiateModules({
        dataEmitter: ModuleDataEmitter,
        testModule: [TestModule, {operation: TestModule.operationType.Multiplication} ]
    })

    let plugins = instantiatePlugins({
        autoFormPlugin: [modules.testModule, PluginAutoForm, {
            triggerPolicy: PluginAutoForm.TriggerPolicyEnum.always
        }]
    })

    let observers = {
        obs: new ReplaySubject(1)
    }
    let graph = parseGraph({ branches, modules, plugins, observers })

    new Runner(graph)

    let div = document.createElement('div')
    div.innerHTML = '<div id="autoFormPlugin"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(plugins))

    modules.dataEmitter.emit({ data: [1, 1] })

    observers.obs.pipe(take(1)).subscribe((data) => {
        expect(data).toEqual(1)
    })
    let options = div.querySelectorAll('option')
    expect(options[0].selected).toBeFalsy()
    expect(options[1].selected).toBeTruthy()

    let select = div.querySelector('select')
    select.onchange({
        target: [{
            selected: true,
            value: TestModule.operationType.Addition
        }]
    } as any)

    options = div.querySelectorAll('option')
    
    expect(options[0].selected).toBeTruthy()
    expect(options[1].selected).toBeFalsy()

    observers.obs.pipe(take(1)).subscribe((data) => {
        expect(data).toEqual(2)
    })
    // sending new data should not change the current conf (addition)
    modules.dataEmitter.emit({ data: [1, 1] })
    options = div.querySelectorAll('option')
    
    expect(options[0].selected).toBeTruthy()
    expect(options[1].selected).toBeFalsy()

    observers.obs.pipe(take(1)).subscribe((data) => {
        expect(data).toEqual(2)
        done()
    })
})


test('always trigger: no duplicated emit', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '                    |~testModule~|---$obs$--',
        '|~dataEmitter~|---|~autoFormPlugin~|'
    ]

    let modules = instantiateModules({
        dataEmitter: ModuleDataEmitter,
        testModule: [TestModule, {operation: TestModule.operationType.Multiplication} ]
    })

    let plugins = instantiatePlugins({
        autoFormPlugin: [modules.testModule, PluginAutoForm, {
            triggerPolicy: PluginAutoForm.TriggerPolicyEnum.always
        }]
    })

    let observers = {
        obs: new ReplaySubject(1)
    }
    let graph = parseGraph({ branches, modules, plugins, observers })

    new Runner(graph)

    observers.obs.pipe(
        reduce( (acc,e) => {
           return acc+1 
        },0 )
    ).subscribe(
        (count) => {
            expect(count).toEqual(3)
            done()
        }
    )
    let div = document.createElement('div')
    div.innerHTML = '<div id="autoFormPlugin"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(plugins))
    // count = 1
    modules.dataEmitter.emit({ data: [1, 1] })

    let select = div.querySelector('select')
    // count = 2
    select.onchange({target: [{ selected: true,  value: TestModule.operationType.Addition }]} as any)

    // count = 3
    modules.dataEmitter.emit({ data: [1, 1] })
    observers.obs.complete()
})

