
export interface Item{
    id: number
}

export type ModifyTask = { action: 'select'; payload: { id: number } } | { action: 'deselect'; payload: { id: number } } | { action: 'move'; payload: { draggedItemId: number; targetItemId: number | null } };

class DataStore{
    private static instance: DataStore

    private readonly store: Map<number, Item> = new Map()
    private readonly STORE_SIZE: number = 1_000_000

    private selectedStore: number[] = []
    private addQueue: Set<number> = new Set()
    private modifyQueue: ModifyTask[] = []

    private constructor(){
        this._initialize()
    }

    private _initialize(){
        for(let i = 1; i <= this.STORE_SIZE; i++){
            this.store.set(i, { id: i })
        }
    }

    public static getInstance(): DataStore {
        if(!DataStore.instance){
            DataStore.instance = new DataStore()
        }
        return DataStore.instance
    }

    public itemExist(id: number):boolean {
        return this.store.has(id)
    }

    public getItemById(id: number): Item | undefined {
        return this.store.get(id)
    }

    public addNewItemInStore(item: Item): boolean {
        if(this.itemExist(item.id)){
            return false
        }
        this.store.set(item.id, item)
        return true
    }

    public getSelectedStore(): number[]{
        return this.selectedStore
    }

    public setSelectedStore(newStore: number[]): void{
        this.selectedStore = newStore
    } 

    public addItemToAddQueue(itemId: number): boolean {
        if(this.itemExist(itemId)){
            return false
        }
        this.addQueue.add(itemId)
        return true
    }

    public getAndClearAddQueue(): number[]{
        const items = [...this.addQueue]
        this.addQueue.clear()
        return items
    }

    public addToModifyQueue(task: ModifyTask): void {
        this.modifyQueue.push(task);
    }

    public getAndClearModifyQueue(): ModifyTask[] {
        const tasks = this.modifyQueue;
        this.modifyQueue = []
        return tasks
    }

    public getStore(): Map<number, Item> {
        return this.store
    }

}

export const dataStore = DataStore.getInstance()