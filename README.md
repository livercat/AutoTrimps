# AutoTrimps - Ray Fork



## Discussion / Discord Channel
<a href="https://discord.com/channels/371177798305447938/371348913036197899"><img src="https://discord.com/assets/3437c10597c1526c3dbd98c737c2bcae.svg" width=48></a>
Discord is a chat program. Come to talk about AutoTrimps, for help, or suggestions for new features : https://discord.com/channels/371177798305447938/371348913036197899



## Current Version - Ongoing Development!
- Zek Fork. All changes made by Zek using GenBTC as base. Currently up-to-date as of 04/2021.
- Ray Fork. U1 code heavily rewritten and changed by Psycho-Ray, with big contributions from livercat. Please report any bugs you may find.

## Changelist vs Zek's Fork
Well, I changed a lot, and didn't properly keep track of it, but I made and effort to create a change list with whatever came to my mind. 
You can check it at the end of this README.


## AT Script Installation
### Browser
Step 1:  
Install TamperMonkey:  
https://www.tampermonkey.net/

Step 2:  
Click this link: https://github.com/Psycho-Ray/AutoTrimps/raw/gh-pages/.user.js  
If clicking the link does not work, copy the contents of user.js into a new script inside tampermonkey.  
If you are unsure how to do that, copy this:  
```
var script = document.createElement('script');
script.id = 'AutoTrimps-Ray';
script.src = 'https://Psycho-Ray.github.io/AutoTrimps/AutoTrimps2.js';
script.setAttribute('crossorigin',"anonymous");
document.head.appendChild(script);
```  
Press F12 inside the game, this opens the console, and paste the text into it and hit enter, this will load the script. You will have to do this everytime you refresh the game though so I recommend getting tampermonkey to do it for you!

Step 3:  
Configure settings. Will NOT work as intended with default settings. 

### Steam
Step 1:  
Go to this link to open the mods.js file on Github: <a href="https://github.com/Psycho-Ray/AutoTrimps/blob/gh-pages/modules/mods.js">mods.js</a>  
Then, right click the Raw button, hit Save link as, and save the mods.js file somewhere to your computer where you can find it, like desktop.  
![Download mods.js](https://i.imgur.com/opuO6yd.png)  

Step 2:  
In your Steam Library (where you see all your games in the Steam app), right click on Trimps, go to Manage, then Browse local files.  
A folder where Trimps is installed inside Steam should open.  
![Go to Trimps directory](https://imgur.com/cr35LK2.png)

Inside this folder, navigate to the mods folder (you should be in Steam\steamapps\common\Trimps\mods), and place the mods.js file there, like so:  
![Insert mods.js](https://imgur.com/muW6cUh.png)

Advanced users: If you have other mods installed then just copy the text in AT's mods.js and place it somewhere in your existing mods.js file.

Step 3:  
Restart the game, or if the game is already running, hit F5 to refresh.

Step 4:  
Configure your settings. AT will not work properly if they are not configured!

## Graphs only Script Installation
### Browser
Step 1:  
Install TamperMonkey:  
https://www.tampermonkey.net/

Step 2: 
Click this link: https://github.com/Psycho-Ray/AutoTrimps/blob/gh-pages/GraphsOnly.user.js
If clicking the link does not work, copy the contents of GraphsOnly.user.js into a new script inside tampermonkey.
If you are unsure how to do that, copy this:
```
var script = document.createElement('script');
script.id = 'AutoTrimps-Graphs';
script.src = 'https://Psycho-Ray.github.io/AutoTrimps/GraphsOnly.js';
script.setAttribute('crossorigin',"anonymous");
document.head.appendChild(script);
```  
Press F12 inside the game, this opens the console, and paste the text into it and hit enter, this will load the script. You will have to do this everytime you refresh the game though so I recommend getting tampermonkey to do it for you!  

Step 3:  
Enjoy your Graphs!

### Steam
Step 1:  
Go to this link to open the modsGRAPH.js file on Github: <a href="https://github.com/Psycho-Ray/AutoTrimps/blob/gh-pages/modsGRAPH.js">modsGRAPH.js</a>  
Then, right click the Raw button, hit Save link as, and save the modsGRAPH.js file somewhere to your computer where you can find it, like desktop.  
![Download mods.js](https://i.imgur.com/opuO6yd.png)  

Step 2:  
Rename the modsGRAPH.js file to mods.js (Right click the file, rename, then remove GRAPH). Sorry but I can't have 2 mods.js named the same so Graphs Only users have to deal with it :(

Step 3:  
In your Steam Library (where you see all your games in the Steam app), right click on Trimps, go to Manage, then Browse local files.  
A folder where Trimps is installed inside Steam should open.  
![Go to Trimps directory](https://imgur.com/cr35LK2.png)

Inside this folder, navigate to the mods folder (you should be in Steam\steamapps\common\Trimps\mods), and place the mods.js file that we renamed earlier there, like so:  
![Insert mods.js](https://imgur.com/muW6cUh.png)

Advanced users: If you have other mods installed then just copy the text in AT's mods.js and place it somewhere in your existing mods.js file.

Step 4:  
Restart the game, or if the game is already running, hit F5 to refresh.

Step 5:  
Enjoy your Graphs!

## Equipment && Upgrade's colour explaination:
Updated Explanation on Discord: <a href="https://discord.com/channels/371177798305447938/962199816270651564">AT FAQ</a>

## Troubleshooting
**Combat won't start** - Make sure you have enabled the Better Auto Fight/Vanilla setting in Combat & Stance Settings. If you're not on dark theme, you may see a tiny thin black bar in combat, click it to show this setting.

## Changelist
The most notable changes were in calculations. AT used to not do well with many of the challenges or, let's say events to avoid spoilers, that happened along the way.
- One of the consequences was that it failed to Stance Dance properly. My fork has a 100% perfect Stance Dance goal in every challenge and situation.
- Another was how it miscalculated how much it needed to farm at various stages in the game, forcing the player to adjust the farming target all that to compensate for the calc errors. For example, it considers the average impact of Corruption rather than the full value. Kinda. Still, it helps a lot with early corruption.
- A ton of errors related to this where fixed.

Another noticeable changes, which is the closest I can get to creating a list of changes (in order of game progression):
- Completely rewrote gathering in early game to make it more efficient.
- Better Dynamic Gyms
- Optional changes to how it builds housing (always considers the efficiency, allowing you to not limit houses)
- A better way of choosing what map to create (and later a WAY better way of doing that, thanks to livercat's help)
- AutoGigas
- A much better way to beat any Spire using the Exit Cell option
- An automatic form of raiding for prestiges that works specially well at Spires (more of that coming soon?)
- Advanced Nurseries
- Auto Fuel Zone which updates what zones you should be in fuel mode as you progress, so you don't have to adjust it at every portal.

Special strategies against certain challenges or situations, like:
- Auto abandon on Decay
- Lead farms on odd zones, and also has dynamic Genes times.
- Doesn't buy more damage than needed during reflect dailies (which became unnecessary after a certain patch launched TWO DAYS after I was done. I had to rant)
- The possibility of only disabling Scrying against corruption, instead of disabling it on the entire zone
- Special calc to improve the results of certain challenges like Domination and many dailies
- Automatically accounts for things like if you decided to scry versus corrupted or not in the above example and adjusts how much it wants to farm to compensate for that.

And I'm sure there is more, specially little details like "don't insta abandon your troops to run a map for prestiges, but do it if above a certain cell", but I guess that's what came to my mind.