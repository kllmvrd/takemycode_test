import { dataStore, Item, ModifyTask } from "../store";

interface PageOptions {
    page?: number;
    limit?: number;
    filter?: string;
}

interface PaginatedResult<T> {
    items: T[];
    totalCount: number;
}

class DataStoreService {
    private addBatchInterval!: NodeJS.Timeout;
    private modifyBatchInterval!: NodeJS.Timeout;

    private readonly ADD_BATCH_INTERVAL: number = 10 * 1000;
    private readonly MODIFY_BATCH_INTERVAL: number = 1000;

    constructor() {
        this.startAddBatchProcessing();
        this.startModificationBatchProcessing();
    }

    private startAddBatchProcessing(): void {
        this.addBatchInterval = setInterval(() => {
            const itemsToAdd = dataStore.getAndClearAddQueue();
            for (const itemId of itemsToAdd) {
                dataStore.addNewItemInStore({ id: itemId });
            }
        }, this.ADD_BATCH_INTERVAL);
    }

    private startModificationBatchProcessing(): void {
        this.modifyBatchInterval = setInterval(() => {
            const tasksToRun = dataStore.getAndClearModifyQueue();
            for (const task of tasksToRun) {
                this._executeTask(task);
            }
        }, this.MODIFY_BATCH_INTERVAL);
    }

    private _executeTask(task: ModifyTask): void {
        switch (task.action) {
            case 'select':
                this._executeSelectItem(task.payload.id);
                break;
            case 'deselect':
                this._executeDeselectItem(task.payload.id);
                break;
            case 'move':
                this._executeMoveSelectedItem(task.payload.draggedItemId, task.payload.targetItemId);
                break;
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


