import React, { Children, cloneElement, isValidElement } from 'react';

export const Series = ({ children }) => {
  let currentFrom = 0;

  return (
    <>
      {Children.map(children, (child) => {
        if (!isValidElement(child)) {
          return child;
        }

        const duration = child.props.durationInFrames || 0;
        const newProps = { from: currentFrom };
        currentFrom += duration;

        return cloneElement(child, newProps);
      })}
    </>
  );
};
