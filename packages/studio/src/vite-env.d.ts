/// <reference types="vite/client" />
import React from 'react';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'helios-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement> & { src?: string }, HTMLElement>;
    }
  }
}
