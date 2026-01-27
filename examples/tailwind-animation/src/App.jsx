import React from 'react';

export default function App() {
  return (
    <div className="flex items-center justify-center h-full w-full bg-gray-900 text-white space-x-16">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-32 h-32 bg-blue-500 rounded-lg flex items-center justify-center animate-bounce shadow-lg shadow-blue-500/50">
          <span className="font-bold text-xl">Bounce</span>
        </div>
        <p className="text-gray-400">animate-bounce</p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center animate-pulse shadow-lg shadow-green-500/50">
          <span className="font-bold text-xl">Pulse</span>
        </div>
        <p className="text-gray-400">animate-pulse</p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <div className="w-32 h-32 bg-purple-500 rounded-lg flex items-center justify-center animate-wiggle shadow-lg shadow-purple-500/50">
          <span className="font-bold text-xl">Wiggle</span>
        </div>
        <p className="text-gray-400">custom</p>
      </div>
    </div>
  );
}
