import {
    BuilderView, Flux, Property, RenderView, Schema, ModuleFlux, Pipe,
    freeContract, SideEffects
} from '@youwol/flux-core'
import { HTMLElement$, render } from "@youwol/flux-view"
import { Subscription } from 'rxjs'
import { pack } from './main'
import { Switch } from '@youwol/fv-button'

/**
 ## Presentation

   A simple switch view.

## Resources

Various resources:
-    [fv-button](https://github.com/youwol/fv-button):
the library that provides the underlying implementation
*/
export namespace ModuleSwitch {

    let svgIcon = `
<g xmlns="http://www.w3.org/2000/svg">
    <path d="M359.736,123.428H112.878C50.537,123.428,0,173.967,0,236.308c0,62.342,50.537,112.879,112.878,112.879h246.858    c62.341,0,112.879-50.537,112.879-112.879C472.615,173.967,422.077,123.428,359.736,123.428z M113.066,299.43    c-34.861,0-63.123-28.261-63.123-63.123c0-34.861,28.261-63.122,63.123-63.122c34.861,0,63.123,28.26,63.123,63.122    C176.189,271.169,147.928,299.43,113.066,299.43z"/>
</g>`


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
        * Whether or not the checkbox is checked. Default to true.
        */
        @Property({
            description: "Whether or not the checkbox is checked. Default to true."
        })
        readonly checked: boolean = true


        constructor(params: {
            checked?: boolean
        }) {
            Object.assign(this, params)
        }
    }

    /** ## Module
     *
     * Module's presentation is provided [[ModuleSwitch | here]]
     */
    @Flux({
        pack: pack,
        namespace: ModuleSwitch,
        id: "ModuleSwitch",
        displayName: "Switch",
        description: "Simple switch",
        resources: {
            'technical doc': `${pack.urlCDN}/dist/docs/modules/lib_switch_module.moduleswitch.html`
        }
    })
    @BuilderView({
        namespace: ModuleSwitch,
        icon: svgIcon
    })
    @RenderView({
        namespace: ModuleSwitch,
        render: (mdle: Module) => renderHtmlElement(mdle)
    })
    export class Module extends ModuleFlux {

        readonly output$: Pipe<boolean>

        public readonly switchState: Switch.State

        constructor(params) {
            super(params)

            this.switchState = new Switch.State(this.getPersistentData<PersistentData>().checked)

            this.addInput({
                id: 'configuration',
                description: "Provides a handle to change configuration's checked attribute at run time.",
                contract: freeContract(),
                onTriggered: ({ configuration }) => {
                    this.switchState.value$.next(configuration.checked)
                }
            })

            this.output$ = this.addOutput({ id: "output" })
        }
    }



    export function renderHtmlElement(mdle: Module): HTMLElement {

        let view = new Switch.View({
            state: mdle.switchState,
            style: () => ({ width: 'fit-content' }),
            connectedCallback: (elem: HTMLElement$) => {
                let sub = mdle.switchState.value$.subscribe((checked) => {
                    mdle.output$.next({ data: checked })
                })
                elem.ownSubscriptions(sub)
            },

        } as any)
        return render(view)
    }
}
