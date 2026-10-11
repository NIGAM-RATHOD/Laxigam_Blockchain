import React from 'react';

/** Card wrapper whose gold spotlight follows the cursor (pairs with `.spotlight` in index.css). */
function Spotlight({ as: Tag = 'div', className = '', children, ...props }) {
  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--mx', `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty('--my', `${event.clientY - rect.top}px`);
  };

  return (
    <Tag className={`card spotlight ${className}`} onMouseMove={handleMove} {...props}>
      {children}
    </Tag>
  );
}

export default Spotlight;
