import { WorkspaceGroup } from "resource:///org/gnome/shell/ui/workspaceAnimation.js"

import {
    // cloneWindow,
    Maid,
} from "../libs/utility.js"

export class WorkspaceAnimationFix {
    #maid

    enable() {
        const maid = this.#maid = new Maid()

        maid.patchJob(WorkspaceGroup.prototype, "_createWindows", (_orig) => {
            return function () {
                const windowActors = global.get_window_actors().filter(w =>
                    this._shouldShowWindow(w.meta_window))

                windowActors.map(a => this._createClone(a)).forEach(clone => this.add_child(clone))
                this._syncStacking()
            }
        })

        maid.patchJob(WorkspaceGroup.prototype, "_syncStacking", (_orig) => {
            return function () {
                const wg = global.window_group.get_children()
                const windowActors = global.get_window_actors()
                    .filter(w => {
                        const index = wg.indexOf(w)
                        if (index === -1) return false
                        if (!this._shouldShowWindow(w.meta_window)) return false

                        w.__QE_wsfix_global_index = index
                        return true
                    })
                    .sort((a, b) => a.__QE_wsfix_global_index - b.__QE_wsfix_global_index)

                let lastRecord;
                const bottomActor = this._background ?? null;

                for (const windowActor of windowActors) {
                    const record = this._windowRecords.find(r => r.windowActor === windowActor);
                    if (!record?.clone) continue;

                    this.set_child_above_sibling(record.clone,
                        lastRecord ? lastRecord.clone : bottomActor);
                    lastRecord = record;
                }
            }
        })
    }

    disable() {
        this.#maid.destroy()
        this.#maid = null
    }
}
