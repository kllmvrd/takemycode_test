import React from 'react';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import DroppableTable from '../DroppableTable/DroppableTable';
import DraggableElement from '../DraggableElement/DraggableElement';
import Input from '../Input/Input'; 
import styles from './ItemsList.module.css';

const ItemsList = ({
  id,
  title,
  items,
  activeId,
  onScroll,
  isLoading,
  tableRef,
  filterValue,      
  onFilterChange,   
}) => {
  const itemIds = items.map(item => item.id);

  return (
    <div className={styles.listContainer}>
      <h2 className={styles.listTitle}>{title}</h2>
      <Input
        type="search"
        placeholder="Фильтр по ID..."
        value={filterValue}
        onChange={onFilterChange}
      />
      <DroppableTable id={id} onScroll={onScroll} tableRef={tableRef}>
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <DraggableElement 
              key={item.id} 
              id={item.id} 
              isPending={item.status === 'pending'}
              isDragging={item.id === activeId}
            >
              {item.id}
            </DraggableElement>
          ))}
        </SortableContext>
        {isLoading && <p className={styles.loadingText}>Загрузка...</p>}
      </DroppableTable>
    </div>
  );
};

export default ItemsList;
