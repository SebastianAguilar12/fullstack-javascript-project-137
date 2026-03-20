/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./src/js/index.js"
/*!*************************!*\
  !*** ./src/js/index.js ***!
  \*************************/
() {

eval("{const rssForm = document.querySelector('#rss-form');\r\n\r\nrssForm.addEventListener('submit', (e) => {\r\n  e.preventDefault();\r\n  const userUrl = e.target.querySelector('#link').value;\r\n  fetch(userUrl)\r\n    .then((data) => console.log(data));\r\n});\n\n//# sourceURL=webpack://@hexlet/code/./src/js/index.js?\n}");

/***/ }

/******/ 	});
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module can't be inlined because the eval devtool is used.
/******/ 	var __webpack_exports__ = {};
/******/ 	__webpack_modules__["./src/js/index.js"]();
/******/ 	
/******/ })()
;