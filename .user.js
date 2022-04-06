// ==UserScript==
// @name         AutoTrimps-Ray
// @version      6.0.0.0
// @namespace    https://Psycho-Ray.github.io/AutoTrimps
// @downloadURL  https://Psycho-Ray.github.io/AutoTrimps/.user.js
// @updateURL    https://Psycho-Ray.github.io/AutoTrimps/.user.js
// @description  Automate all the trimps!
// @author       zininzinin, spindrjr, Ishkaru, genBTC, Zeker0, Psycho-Ray
// @include      *trimps.github.io*
// @include      *kongregate.com/games/GreenSatellite/trimps
// @connect      *Zorn192.github.io/AutoTrimps*
// @connect      *trimps.github.io*
// @connect      self
// @grant        GM_xmlhttpRequest
// ==/UserScript==

var script = document.createElement('script');
script.id = 'AutoTrimps-Ray';
//This can be edited to point to your own Github Repository URL.
script.src = 'https://Psycho-Ray.github.io/AutoTrimps/AutoTrimps2.js';
//script.setAttribute('crossorigin',"use-credentials");
script.setAttribute('crossorigin',"anonymous");
document.head.appendChild(script);
