const fs = require('fs');
const path = 'android/app/build.gradle';

let content = fs.readFileSync(path, 'utf8');

// React Native often has project.ext.react = [ ... ]
// We will look for project.ext.react = [
// and inject port: 8082
if (content.includes('project.ext.react = [')) {
  content = content.replace(
    'project.ext.react = [',
    'project.ext.react = [\n    port: 8082,'
  );
  fs.writeFileSync(path, content);
  console.log("Patched build.gradle successfully");
} else {
  // If it doesn't exist, we can add it before apply from: "../../node_modules/react-native/react.gradle"
  if (content.includes('apply from: "../../node_modules/react-native/react.gradle"')) {
    content = content.replace(
      'apply from: "../../node_modules/react-native/react.gradle"',
      'project.ext.react = [\n    port: 8082\n]\napply from: "../../node_modules/react-native/react.gradle"'
    );
    fs.writeFileSync(path, content);
    console.log("Added project.ext.react to build.gradle successfully");
  } else {
    console.log("Could not find injection point");
  }
}
