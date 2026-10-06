const { spawn } = require('child_process');
const frontend = spawn('npm', ['run', 'dev'], { 
  cwd: 'C:\\Users\\VASAVI VANAM\\Desktop\\శనీ\\enterprise-hrms\\frontend',
  shell: true,
  stdio: 'inherit'
});