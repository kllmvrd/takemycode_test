import { dataStore, Item, ModifyTask } from "../store";
import { EventEmitter } from 'events';

interface PageOptions {
    page?: number;
    limit?: number;
    filter?: string;
}

interface PaginatedResult<T> {
    items: T[];
    totalCount: number;
}

export type DataChangeEvent =
    { type: 'item_selected'; payload: number }
    | { type: 'item_deselected'; payload: number }
    | { type: 'item_moved'; payload: { draggedItemId: number; targetItemId: number | null } };

export type SseEvent = { type: 'new_items_added'; payload: number[] } | { type: 'batch_update'; payload: DataChangeEvent[] };


class DataStoreService extends EventEmitter {
    private addBatchInterval!: NodeJS.Timeout;
    private modifyBatchInterval!: NodeJS.Timeout;

    private readonly ADD_BATCH_INTERVAL: number = 10 * 1000;
    private readonly MODIFY_BATCH_INTERVAL: number = 1000;

    constructor() {
        super();
        this.startAddBatchProcessing();
        this.startModificationBatchProcessing();
    }

    private startAddBatchProcessing(): void {
        this.addBatchInterval = setInterval(() => {
            const itemsToAdd = dataStore.getAndClearAddQueue();
            if (itemsToAdd.length > 0) {
                for (const itemId of itemsToAdd) {
                    dataStore.addNewItemInStore({ id: itemId });
                }
                this.emit('update', { type: 'new_items_added', payload: itemsToAdd });
            }
        }, this.ADD_BATCH_INTERVAL);
    }

    private startModificationBatchProcessing(): void {
        this.modifyBatchInterval = setInterval(() => {
            const tasksToRun = dataStore.getAndClearModifyQueue();
            if (tasksToRun.length > 0) {
                const events: DataChangeEvent[] = tasksToRun.map(task => this._executeTask(task));
                if(events.length > 0){
                    this.emit('update', { type: 'batch_update', payload: events });
                }
            }
        }, this.MODIFY_BATCH_INTERVAL);
    }

    private _executeTask(task: ModifyTask): DataChangeEvent {
        switch (task.action) {
            case 'select':
                this._executeSelectItem(task.payload.id);
                return { type: 'item_selected', payload: task.payload.id };
            case 'deselect':
                this._executeDeselectItem(task.payload.id);
                return { type: 'item_deselected', payload: task.payload.id };
            case 'move':
                this._executeMoveSelectedItem(task.payload.draggedItemId, task.payload.targetItemId);
                return { type: 'item_moved', payload: task.payload };
        }
    }

    private _executeSelectItem(id: number): void {
        const currentSelected = dataStore.getSelectedStore();
        if (!currentSelected.includes(id)) {
            const newSelected = [...currentSelected, id];
            dataStore.setSelectedStore(newSelected);
        }
    }

    private _executeDeselectItem(id: number): void {
        const currentSelected = dataStore.getSelectedStore();
        if (currentSelected.includes(id)) {
            const newSelected = currentSelected.filter(itemId => itemId !== id);
            dataStore.setSelectedStore(newSelected);
        }
    }

    private _executeMoveSelectedItem(draggedItemId: number, targetItemId: number | null): void {
        const currentSelected = dataStore.getSelectedStore();
        const draggedItemIndex = currentSelected.indexOf(draggedItemId);

        if (draggedItemIndex === -1) {
            return;
        }

        const [itemToMove] = currentSelected.splice(draggedItemIndex, 1);

        if (targetItemId === null) {
            currentSelected.push(itemToMove);
        } else {
            const targetIndex = currentSelected.indexOf(targetItemId);
            if (targetIndex !== -1) {
                currentSelected.splice(targetIndex, 0, itemToMove);
            } else {
                currentSelected.push(itemToMove);
            }
        }
        dataStore.setSelectedStore(currentSelected);
    }

    public stopAddBatchProcessing(): void {
        clearInterval(this.addBatchInterval);
    }

    public stopModifyBatchProcessing(): void {
        clearInterval(this.modifyBatchInterval);
    }

    public queueNewItem(id: number): void {
        dataStore.addItemToAddQueue(id);
    }

    public selectItem(id: number): void {
        dataStore.addToModifyQueue({ action: 'select', payload: { id } });
    }

    public deselectItem(id: number): void {
        dataStore.addToModifyQueue({ action: 'deselect', payload: { id } });
    }

    public moveSelectedItem(draggedItemId: number, targetItemId: number | null): void {
        dataStore.addToModifyQueue({ action: 'move', payload: { draggedItemId, targetItemId } });
    }

    public getAvailableItems(options: PageOptions): PaginatedResult<Item> {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const filter = options.filter || '';

        const selectedIds = new Set(dataStore.getSelectedStore());
        const allItems = dataStore.getStore();
        
        let availableIds: number[] = [];
        for (const id of allItems.keys()) {
            if (!selectedIds.has(id)) {
                if (!filter || String(id).includes(filter)) {
                    availableIds.push(id);
                }
            }
        }
        
        const totalCount = availableIds.length;
        const startIndex = (page - 1) * limit;
        const paginatedIds = availableIds.slice(startIndex, startIndex + limit);

        const items = paginatedIds.map(id => allItems.get(id)!);

        return { items, totalCount };
    }

    public getSelectedItems(options: PageOptions): PaginatedResult<Item> {
        const page = options.page || 1;
        const limit = options.limit || 20;
        const filter = options.filter || '';
        
        const allSelectedIds = dataStore.getSelectedStore();

        const filteredIds = !filter 
            ? allSelectedIds 
            : allSelectedIds.filter(id => String(id).includes(filter));

        const totalCount = filteredIds.length;
        const startIndex = (page - 1) * limit;
        const paginatedIds = filteredIds.slice(startIndex, startIndex + limit);

        const items = paginatedIds.map(id => dataStore.getItemById(id)!);
        
        return { items, totalCount };
    }
}

export const dataStoreService = new DataStoreService();


