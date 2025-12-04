import React from 'react';
import styles from './Table.module.css';

const Table = ({ className = '', children, ...props }) => {
  return (
    <div className={`${styles.tableContainer} ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Table;
