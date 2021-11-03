import {
    BuilderView, Flux, Property, RenderView, Schema, ModuleFlux, Pipe, freeContract, Context
} from '@youwol/flux-core'
import { HTMLElement$, render, VirtualDOM } from "@youwol/flux-view"
import { Button } from '@youwol/fv-button'
import { Observable, Subject } from 'rxjs'
import { pack } from './main'

/**
 ## Presentation

   A custom view implemented using [flux-view](https://github.com/youwol/flux-view)

   Assuming at least input and output (defined in the module's configuration), 
   and an incoming message with a data part like `{value:number, text:string}`, 
   it is possible to define a view like this: 
   ```javascript
   * return (inputs, outputs) => {
   *     return {
   *         children: [
   *            child$(
   *                inputs[0],
   *                ({ data, context }) => {
   *                    return {
   *                        tag: 'span',
   *                        id: 'test-custom-view',
   *                        innerText: data.text,
   *                        onclick: () => outputs[0].next({ data: data.value, context })
   *                    }
   *                },
   *                {
   *                    untilFirst: {
   *                        tag: 'span',
   *                        id: 'test-custom-view',
   *                        innerText: 'no data yet',
   *                        onclick: () => { outputs[0].next({ data: -1 }) }
   *                    }
   *                }
   *            )
   *        ]
   *    }
   *}
   ```
*/
export namespace ModuleCustomView {

    let svgIcon = `<path xmlns="http://www.w3.org/2000/svg" d="M446.029,0L130.498,267.303l-20.33,66.646c-8.624,7.369-19.857,11.39-32.017,11.391c-4.776,0-9.583-0.622-14.293-1.848    l-14.438-3.761L0,512l172.268-49.421l-3.759-14.438c-4.454-17.1-0.883-34.137,9.54-46.309l66.648-20.331L512,65.971L446.029,0z     M136.351,441.068l-61.413,17.618l42.732-42.732L96.045,394.33l-42.731,42.732l17.627-61.444c2.401,0.202,4.807,0.303,7.21,0.303    c16.215-0.001,31.518-4.56,44.35-13.043l26.609,26.609C139.202,404.41,134.73,422.458,136.351,441.068z M173.977,371.102    l-33.079-33.078l10.109-33.14l56.109,56.109L173.977,371.102z M235.003,345.632l-68.636-68.636l46.828-39.671l61.478,61.478    L235.003,345.632z M236.61,217.492L444.314,41.535l26.152,26.152L294.509,275.391L236.61,217.492z"/>`

    let defaultImplementation = `
return (inputs, outputs) => {
    return {
        tag: 'span',
        innerText: 'hello custom view :)'
    }
}    
`
    type TInput = { data: unknown, configuration: PersistentData, context: Context }
    /**
     * ## Persistent Data  🔧
     *
     * Persisted properties of the module are the attributes of this object.
     */
    @Schema({
        pack
    })
    export class PersistentData {

        /**
         * Number of inputs
         */
        @Property({
            description: "number of input",
        })
        inputsCount: number = 0

        /**
         * Number of outputs
         */
        @Property({
            description: "number of output"
        })
        outputsCount: number = 0

        /**
         * Implementation function, can be a string representation of it
         */
        @Property({
            description: "view's implementation",
            type: 'code'
        })
        implementation: string | ((inputs: Observable<TInput>[], outputs: Pipe<unknown>[]) => VirtualDOM) = defaultImplementation

        private readonly parsedImplementation: (inputs: Observable<TInput>[], outputs: Pipe<unknown>[]) => VirtualDOM

        getView(inputs: Observable<TInput>[], outputs: Pipe<unknown>[]) {

            return this.parsedImplementation(inputs, outputs)
        }


        /**
         * 
         * @param params contructor's parameters
         * @param params.inputsCount input count of the module
         * @param params.outputsCount output's count of the module
         * @param params.implementation implementation function, can be a string representation of it
         */
        constructor(params: {
            inputsCount?: number,
            outputsCount?: number,
            implementation?: string | ((inputs: Observable<TInput>[], outputs: Pipe<unknown>[]) => VirtualDOM)
        } = {}) {
            Object.assign(this, params)
            this.parsedImplementation = (typeof (this.implementation) == 'string')
                ? new Function(this.implementation)()
                : this.implementation
        }
    }

    /** ## Module
     *
     * See [[ModuleCustomView]] for a presentation of the module
     */
    @Flux({
        pack: pack,
        namespace: ModuleCustomView,
        id: "ModuleCustomView",
        displayName: "Custom View",
        description: "A custom view interacting with inputs/outputs.",
        resources: {
            'technical doc': `${pack.urlCDN}/dist/docs/modules/lib_custom_view_module.modulecustomview.html`
        }
    })
    @BuilderView({
        namespace: ModuleCustomView,
        icon: svgIcon
    })
    @RenderView({
        namespace: ModuleCustomView,
        render: (mdle: Module) => renderHtmlElement(mdle)
    })
    export class Module extends ModuleFlux {

        public readonly inputs$: Subject<{ data: unknown, configuration: PersistentData, context: Context }>[] = []
        public readonly outputs$: Pipe<unknown>[] = []


        constructor(params) {
            super(params)
            let config = this.getPersistentData<PersistentData>()

            for (let i = 0; i < config.inputsCount; i++) {
                let input$ = new Subject<{ data: unknown, configuration: PersistentData, context: Context }>()
                this.inputs$.push(input$)
                this.addInput({
                    id: `input_${i}`,
                    description: '',
                    contract: freeContract(),
                    onTriggered: ({ data, configuration, context }) => {
                        input$.next({ data, configuration, context })
                    }
                })
            }

            for (let i = 0; i < config.outputsCount; i++)
                this.outputs$.push(this.addOutput({ id: `output_${i}` }))
        }
    }

    /**
     * 
     * @param mdle module's instance from which the view is defined
     * @returns the view
     */
    export function renderHtmlElement(mdle: Module): HTMLElement {

        let view = mdle.getPersistentData<PersistentData>().getView(mdle.inputs$, mdle.outputs$)
        return render(view)
    }
}
