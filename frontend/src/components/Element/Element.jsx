import React from 'react';
import styles from './Element.module.css';

const Element = ({ id, className = '', children, ...props }) => {
  return (
    <div className={`${styles.element} ${className}`} {...props}>
      {id || children}
    </div>
  );
};

export default Element;
