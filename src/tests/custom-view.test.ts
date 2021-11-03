import { instantiateModules, ModuleDataEmitter, parseGraph, renderTemplate, Runner } from "@youwol/flux-core"
import { child$ } from "@youwol/flux-view"
import { ReplaySubject } from "rxjs"
import { skip, take } from "rxjs/operators"
import { ModuleButton } from "../index"
import { ModuleCustomView } from "../lib/custom-view.module"

console.log = () => { }


test('Custom view, default ', (done) => {

    document.body.innerHTML = ""

    let branches = [
        '|~custom-view~|---'
    ]

    let modules = instantiateModules({
        'custom-view': ModuleCustomView,
    })

    let graph = parseGraph({ branches, modules })

    new Runner(graph)

    let div = document.createElement('div')
    div.innerHTML = '<div id="custom-view"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(modules))

    let view = div.querySelector("span")
    expect(view).toBeDefined()

    done()
})

test('Custom view, no IO', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '|~custom-view~|---'
    ]

    let modules = instantiateModules({
        'custom-view': [
            ModuleCustomView,
            {
                implementation: (inputs, outputs) => {
                    return {
                        id: 'test-custom-view',
                        innerText: 'Test custom view'
                    }
                }
            }],
    })

    let graph = parseGraph({ branches, modules })

    new Runner(graph)

    let div = document.createElement('div')
    div.innerHTML = '<div id="custom-view"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(modules))

    let view = document.getElementById('test-custom-view')
    expect(view).toBeDefined()

    done()
})

test('Custom view, with IO', (done) => {

    document.body.innerHTML = ""
    let branches = [
        '|~dataEmitter~|----|~custom-view~|----$obs$--'
    ]

    let modules = instantiateModules({
        dataEmitter: ModuleDataEmitter,
        'custom-view': [
            ModuleCustomView,
            {
                inputsCount: 1,
                outputsCount: 1,
                implementation: (inputs, outputs) => {
                    return {
                        children: [
                            child$(
                                inputs[0],
                                ({ data, context }) => {
                                    return {
                                        tag: 'span',
                                        id: 'test-custom-view',
                                        innerText: data.text,
                                        onclick: () => outputs[0].next({ data: data.value, context })
                                    }
                                },
                                {
                                    untilFirst: {
                                        tag: 'span',
                                        id: 'test-custom-view',
                                        innerText: 'no data yet',
                                        onclick: () => { outputs[0].next({ data: -1 }) }
                                    }
                                }
                            )
                        ]
                    }
                }
            }],
    })
    let observers = {
        obs: new ReplaySubject(1)
    }
    let graph = parseGraph({ branches, modules, observers })

    new Runner(graph)

    let div = document.createElement('div')
    div.innerHTML = '<div id="custom-view"></div>'
    document.body.appendChild(div)
    renderTemplate(div, Object.values(modules))

    let view = document.getElementById('test-custom-view')
    expect(view).toBeDefined()
    expect(view.innerText).toEqual('no data yet')
    view.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    observers.obs.pipe(take(1)).subscribe((data) => {
        expect(data).toEqual(-1)
    })
    modules.dataEmitter.emit({ data: { text: 'test updated content', value: 1 } })

    view = document.getElementById('test-custom-view')
    view.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(view.innerText).toEqual('test updated content')
    observers.obs.pipe(take(1)).subscribe((data) => {
        expect(data).toEqual(1)
        done()
    })
})
