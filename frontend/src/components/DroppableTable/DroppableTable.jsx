import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import Table from '../Table/Table';

const DroppableTable = ({ id, children, onScroll, tableRef }) => {
  const { setNodeRef } = useDroppable({ id: id });

  const combinedRef = (node) => {
    setNodeRef(node);
    if (tableRef) {
      tableRef.current = node;
    }
  };

  return (
    <Table id={id} ref={combinedRef} onScroll={onScroll}>
      {children}
    </Table>
  );
};

export default DroppableTable;
