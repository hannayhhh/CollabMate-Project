// memfs takes over the fs of the node
jest.mock('fs', () => require('memfs').fs);

const { vol } = require('memfs');
const path = require('path');

// Reset the memory disk and create the same data file path as the project
beforeEach(() => {
  vol.reset();
  
  const dataDir = path.join(__dirname, '../data');

  vol.fromJSON(
    {
      [path.join(dataDir, 'users.json')]: '[]',
      [path.join(dataDir, 'tasks.json')]: '[]',
      [path.join(dataDir, 'teams.json')]: '[]',
    },
    '/' // memfs root
  );
});
