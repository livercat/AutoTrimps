MODULES["buildings"] = {};
MODULES["buildings"].storageMainCutoff = 0.85;
MODULES["buildings"].storageLowlvlCutoff1 = 0.7;
MODULES["buildings"].storageLowlvlCutoff2 = 0.5;

//Helium
var housingList = ['Hut', 'House', 'Mansion', 'Hotel', 'Resort', 'Gateway', 'Collector', 'Warpstation'];

function safeBuyBuilding(building) {
    if (isBuildingInQueue(building))
        return false;
    if (game.buildings[building].locked)
        return false;
    var oldBuy = preBuy2();

  if (game.talents.deciBuild.purchased) {
        game.global.buyAmt = 10;
    if (!canAffordBuilding(building)) {
        game.global.buyAmt = 2;
	if (!canAffordBuilding(building))
            game.global.buyAmt = 1;
     }
  }
  else if (bwRewardUnlocked("DoubleBuild")) {
        game.global.buyAmt = 2;
  	if (!canAffordBuilding(building)) 
        game.global.buyAmt = 1;
  }        
  else game.global.buyAmt = 1;

  if (!canAffordBuilding(building)) {
      postBuy2(oldBuy);
      return false;
  }

    game.global.firing = false;
	
    if (building == 'Gym' && getPageSetting('GymWall')) {
        game.global.buyAmt = 1;
    }
    if (building == 'Warpstation' && !game.buildings[building].locked && canAffordBuilding(building)) {
        if (game.buildings.Warpstation.owned < 2) {
            game.global.buyAmt = 'Max';
            game.global.maxSplit = 1;
        } else {
            game.global.buyAmt = 1;
        }
        buyBuilding(building, true, true);
        debug('Building ' + game.global.buyAmt + ' ' + building + 's', "buildings", '*rocket');
        postBuy2(oldBuy);
        return;
    }
    if (building != 'Trap') debug('Building ' + building, "buildings", '*hammer2');
    if (!game.buildings[building].locked && canAffordBuilding(building)) {
	    buyBuilding(building, true, true);
    }
    postBuy2(oldBuy);
    return true;
}

function advancedNurseries(HDStatus) {
    //Only build nurseries if: A) Lacking Health & B) Not lacking Damage & C&D) Has max Map Stacks E) Has at least 1 Map Stack F) Not farming Spire or advN is off
    //Also, it requires less health during spire
    var a = calcHealthRatio(false, true) < getMapHealthCutOff();
    var b = HDStatus.hdRatio < getFarmCutOff() || weaponCapped();
    var c = game.global.mapBonus >= getPageSetting('MaxMapBonushealth');
    var d = game.global.mapBonus >= getPageSetting('MaxMapBonuslimit') || HDStatus.hdRatio < getMapCutOff();
    var e = game.global.mapBonus >= 1 || getPageSetting('MaxMapBonuslimit') == 0 || getPageSetting('MaxMapBonushealth') == 0;
    var f = !preSpireFarming || !getPageSetting('AdvancedNurseries');
    var off = !getPageSetting('AdvancedNurseries') || game.stats.highestLevel.valueTotal() < 230;
    return off || (a && b && c && d && e && f);
}

function buyFoodEfficientHousing() {
    //Init
    var ignoresLimit = getPageSetting('FoodEfficiencyIgnoresMax')
    var unlockedHousing = ["Hut", "House", "Mansion", "Hotel", "Resort"].filter(b => !game.buildings[b].locked);

    //Resets Border Color
    unlockedHousing.forEach(b => document.getElementById(b).style.border = "1px solid #FFFFFF")

    //Checks for Limits
    if (!ignoresLimit) {
        unlockedHousing = unlockedHousing.filter(b => {
            //Filter out buildings that are past the limits
            if (game.buildings[b].owned < getPageSetting('Max' + b) || getPageSetting('Max' + b) < 1)
                return true;

            //But paints their border before removing them
            document.getElementById(b).style.border = "1px solid orange"
            return false
        })
    }

    //Determines Food Efficiency for each housing
    var buildOrder = unlockedHousing.map(b => ({
        'name': b,
        'ratio': getBuildingItemPrice(game.buildings[b], "food", false, 1) / game.buildings[b].increase.by
    }));

    //Grabs the most Food Efficient Housing
    if (buildOrder.length == 0) return;
    bestFoodBuilding = buildOrder.reduce((best, current) => current.ratio < best.ratio ? current : best)

    //If Food Efficiency Ignores Limit is enabled, then it only buy Huts and Houses here
    if (!ignoresLimit || ["Hut", "House"].includes(bestFoodBuilding.name)) {
        document.getElementById(bestFoodBuilding.name).style.border = "1px solid #00CC01";
        safeBuyBuilding(bestFoodBuilding.name);
    }
}

function buyGemEfficientHousing() {
    var gemHousing = ["Mansion", "Hotel", "Resort", "Gateway", "Collector", "Warpstation"];
    var unlockedHousing = [];
    for (var house in gemHousing) {
        if (game.buildings[gemHousing[house]].locked === 0) {
            unlockedHousing.push(gemHousing[house]);
        }
    }
    var obj = {};
    for (var house in unlockedHousing) {
        var building = game.buildings[unlockedHousing[house]];
        var cost = getBuildingItemPrice(building, "gems", false, 1);
        var ratio = cost / building.increase.by;
        obj[unlockedHousing[house]] = ratio;
        document.getElementById(unlockedHousing[house]).style.border = "1px solid #FFFFFF";
    }
    var keysSorted = Object.keys(obj).sort(function (a, b) {
            return obj[a] - obj[b];
        });
    var bestGemBuilding = null;
    for (var best in keysSorted) {
        var max = getPageSetting('Max' + keysSorted[best]);
        if (max === false) max = -1;
        if (game.buildings[keysSorted[best]].owned < max || max == -1 || (getPageSetting('GemEfficiencyIgnoresMax') && keysSorted[best] != "Gateway")) {
            bestGemBuilding = keysSorted[best];
            document.getElementById(bestGemBuilding).style.border = "1px solid #00CC00";

            //Gateway Wall
            if (bestGemBuilding == "Gateway" && getPageSetting('GatewayWall') > 1) {
                if (getBuildingItemPrice(game.buildings.Gateway, "fragments", false, 1) > (game.resources.fragments.owned / getPageSetting('GatewayWall'))) {
                    document.getElementById(bestGemBuilding).style.border = "1px solid orange";
                    bestGemBuilding = null;
                    continue;
                }
            }

            var skipWarp = false;
            if (getPageSetting('WarpstationCap') && bestGemBuilding == "Warpstation") {
                var firstGigaOK = MODULES["upgrades"].autoGigas == false || game.upgrades.Gigastation.done > 0;
                var gigaCapped = game.buildings.Warpstation.owned >= (Math.floor(game.upgrades.Gigastation.done * getPageSetting('DeltaGigastation')) + getPageSetting('FirstGigastation'))
                if (firstGigaOK && gigaCapped) skipWarp = true;
            }
            var warpwallpct = getPageSetting('WarpstationWall3');
            if (warpwallpct > 1 && bestGemBuilding == "Warpstation") {
                if (getBuildingItemPrice(game.buildings.Warpstation, "metal", false, 1) * Math.pow(1 - game.portal.Resourceful.modifier, game.portal.Resourceful.level) > (game.resources.metal.owned / warpwallpct))
                    skipWarp = true;
            }
            if (skipWarp)
                bestGemBuilding = null;
            var getcoord = getPageSetting('WarpstationCoordBuy');
            if (getcoord && skipWarp) {
                var toTip = game.buildings.Warpstation;
                if (canAffordBuilding("Warpstation")) {
                    var howMany = calculateMaxAfford(game.buildings["Warpstation"], true);
                    var needCoord = game.upgrades.Coordination.allowed - game.upgrades.Coordination.done > 0;
                    var coordReplace = (game.portal.Coordinated.level) ? (25 * Math.pow(game.portal.Coordinated.modifier, game.portal.Coordinated.level)).toFixed(3) : 25;
                    if (!canAffordCoordinationTrimps()) {
                        var nextCount = (game.portal.Coordinated.level) ? game.portal.Coordinated.currentSend : game.resources.trimps.maxSoldiers;
                        var amtToGo = ((nextCount * 3) - game.resources.trimps.realMax());
                        var increase = toTip.increase.by;
                        if (game.portal.Carpentry.level && toTip.increase.what == "trimps.max") increase *= Math.pow(1.1, game.portal.Carpentry.level);
                        if (game.portal.Carpentry_II.level && toTip.increase.what == "trimps.max") increase *= (1 + (game.portal.Carpentry_II.modifier * game.portal.Carpentry_II.level));
                        if (amtToGo < increase * howMany)
                            bestGemBuilding = "Warpstation";
                    }
                }
            }
            break;
        }
    }
    if (bestGemBuilding) {
        bestBuilding = bestGemBuilding
        safeBuyBuilding(bestGemBuilding);
    }
}

function buyBuildings() {
    var customVars = MODULES["buildings"];
    var oldBuy = preBuy2();
    var hidebuild = (getPageSetting('BuyBuildingsNew')===0 && getPageSetting('hidebuildings')==true);
    game.global.buyAmt = 1;
    if (!hidebuild) {
        buyFoodEfficientHousing();
        buyGemEfficientHousing();
  	}
    if (!hidebuild && getPageSetting('MaxWormhole') > 0 && game.buildings.Wormhole.owned < getPageSetting('MaxWormhole') && !game.buildings.Wormhole.locked) {
        safeBuyBuilding('Wormhole');
    }

    //Gyms:
    if (!game.buildings.Gym.locked && (getPageSetting('MaxGym') > game.buildings.Gym.owned || getPageSetting('MaxGym') == -1)) {
        var skipGym = false;
	
	    //Dynamic Gyms
        if (getPageSetting('DynamicGyms')) {
	        //Target Zone
	        var targetZone = game.global.world;
	        if (game.global.challengeActive == "Lead" && !AutoMapState.prepareForVoids && game.global.world%2 == 1) targetZone++;

            //Enemy stats
            var block = calcOurBlock() / (game.global.brokenPlanet ? 2 : 1);
            var pierce = game.global.brokenPlanet ? (getPierceAmt() * (game.global.formation == 3 ? 2 : 1)) : 0;
            var nextGym = game.upgrades.Gymystic.modifier + Math.max(0, game.upgrades.Gymystic.done-1)/100;
            var currentEnemyDamageOK = block > nextGym * calcSpecificEnemyAttack();
            var zoneEnemyDamageOK = block > calcEnemyAttack(undefined, targetZone) * (1 - pierce);

            //Challenge stats
            var moreBlockThanHealth = block >= nextGym * calcOurHealth(true, true);
            var crushedOK = game.global.challengeActive != "Crushed";
            var explosiveOK = game.global.challengeActive != "Daily" || typeof game.global.dailyChallenge.explosive == "undefined";
            //var critDailyOK = game.global.challengeActive != "Daily" || typeof game.global.dailyChallenge.crits == "undefined";
            var challengeOK = moreBlockThanHealth || crushedOK && explosiveOK;

            //Stop buying Gyms if we already have enough block for our current enemy and also a C99 Snimp
            if (currentEnemyDamageOK && zoneEnemyDamageOK && challengeOK) skipGym = true;
	    }
	
	    //Gym Wall
        var gymwallpct = getPageSetting('GymWall');
        if (gymwallpct > 1) {
            if (getBuildingItemPrice(game.buildings.Gym, "wood", false, 1) * Math.pow(1 - game.portal.Resourceful.modifier, game.portal.Resourceful.level)
                > (game.resources.wood.owned / gymwallpct))
                    skipGym = true;
	    }

        //ShieldBlock cost Effectiveness:
        if (game.equipment['Shield'].blockNow) {
            var gymEff = evaluateEquipmentEfficiency('Gym');
            var shieldEff = evaluateEquipmentEfficiency('Shield');
            if ((gymEff.Wall) || (gymEff.Factor <= shieldEff.Factor && !gymEff.Wall))
                skipGym = true;
        }
	
	    //Buy Gym
        if (!needGymystic() && !skipGym) safeBuyBuilding('Gym');
    }
    
    //Tributes:
    if (!game.buildings.Tribute.locked && !hidebuild && (getPageSetting('MaxTribute') > game.buildings.Tribute.owned || getPageSetting('MaxTribute') == -1))
        safeBuyBuilding('Tribute');
    
    //Nurseries Init
    var nurseryZoneOk = game.global.world >= getPageSetting('NoNurseriesUntil');
    var maxNurseryOk = getPageSetting('MaxNursery') < 0 || game.buildings.Nursery.owned < getPageSetting('MaxNursery');

    var spireNurseryActive = game.global.challengeActive != "Daily" && (game.global.world > 200 && isActiveSpireAT() || game.global.world <= 200 && getPageSetting('IgnoreSpiresUntil') <= 200);
    var nurseryPreSpire = spireNurseryActive && game.buildings.Nursery.owned < getPageSetting('PreSpireNurseries');

    var dailySpireNurseryActive = game.global.challengeActive == "Daily" && (disActiveSpireAT() || game.global.world <= 200 && getPageSetting('dIgnoreSpiresUntil') <= 200);
    var dailyNurseryPreSpire = dailySpireNurseryActive && game.buildings.Nursery.owned < getPageSetting('dPreSpireNurseries');

    //Nurseries
    if (game.buildings.Nursery.locked == 0 && !hidebuild && (advancedNurseries() && nurseryZoneOk && maxNurseryOk || nurseryPreSpire || dailyNurseryPreSpire)) {
        //Nursery Wall
        var nurseryWallpct = getPageSetting('NurseryWall');
        if (nurseryWallpct <= 1 || getBuildingItemPrice(game.buildings.Nursery, "gems", false, 1) * Math.pow(1 - game.portal.Resourceful.modifier, game.portal.Resourceful.level) < (game.resources.gems.owned / nurseryWallpct))
            safeBuyBuilding('Nursery');
    }

    postBuy2(oldBuy);
}

function buyStorage() {
    var customVars = MODULES["buildings"];
    var packMod = 1 + game.portal.Packrat.level * game.portal.Packrat.modifier;
    var Bs = {
        'Barn': 'food',
        'Shed': 'wood',
        'Forge': 'metal'
    };
    for (var B in Bs) {
        var jest = 0;
        var owned = game.resources[Bs[B]].owned;
        var max = game.resources[Bs[B]].max * packMod;
        max = calcHeirloomBonus("Shield", "storageSize", max);
        if (game.global.mapsActive && game.unlocks.imps.Jestimp) {
            jest = simpleSeconds(Bs[B], 45);
            jest = scaleToCurrentMap(jest);
        }
        if ((game.global.world == 1 && owned > max * customVars.storageLowlvlCutoff1) ||
            (game.global.world >= 2 && game.global.world < 10 && owned > max * customVars.storageLowlvlCutoff2) ||
            (owned + jest > max * customVars.storageMainCutoff)) {
            if (canAffordBuilding(B) && game.triggers[B].done) {
                safeBuyBuilding(B);
            }
        }
    }
}

//Radon

var RhousingList = ['Hut', 'House', 'Mansion', 'Hotel', 'Resort', 'Gateway', 'Collector'];

function RsafeBuyBuilding(building) {
    if (isBuildingInQueue(building))
        return false;
    if (game.buildings[building].locked)
        return false;
    var oldBuy = preBuy2();

  if (game.talents.deciBuild.purchased) {
        game.global.buyAmt = 10;
    if (!canAffordBuilding(building)) {
        game.global.buyAmt = 2;
	if (!canAffordBuilding(building))
            game.global.buyAmt = 1;
     }
  }
  else if (bwRewardUnlocked("DoubleBuild")) {
        game.global.buyAmt = 2;
  	if (!canAffordBuilding(building)) 
        game.global.buyAmt = 1;
  }        
  else game.global.buyAmt = 1;

  if (!canAffordBuilding(building)) {
      postBuy2(oldBuy);
      return false;
  }

    game.global.firing = false;
	
    debug('Building ' + building, "buildings", '*hammer2');
    if (!game.buildings[building].locked && canAffordBuilding(building)) {
	    buyBuilding(building, true, true);
    }
    postBuy2(oldBuy);
    return true;
}

function RbuyFoodEfficientHousing() {
    var foodHousing = ["Hut", "House", "Mansion", "Hotel", "Resort"];
    var unlockedHousing = [];
    for (var house in foodHousing) {
        if (game.buildings[foodHousing[house]].locked === 0) {
            unlockedHousing.push(foodHousing[house]);
        }
    }
    var buildorder = [];
    if (unlockedHousing.length > 0) {
    for (var house in unlockedHousing) {
        var building = game.buildings[unlockedHousing[house]];
        var cost = getBuildingItemPrice(building, "food", false, 1);
        var ratio = cost / building.increase.by;
        buildorder.push({
            'name': unlockedHousing[house],
            'ratio': ratio
        });
        document.getElementById(unlockedHousing[house]).style.border = "1px solid #FFFFFF";
    }
    buildorder.sort(function (a, b) {
        return a.ratio - b.ratio;
    });
    var bestfoodBuilding = null;
    var bb = buildorder[0];
    var max = getPageSetting('RMax' + bb.name);
    if (game.buildings[bb.name].owned < max || max == -1) {
        bestfoodBuilding = bb.name;
    }
    if (smithylogic(bestfoodBuilding, 'wood', false) && bestfoodBuilding) {
        document.getElementById(bestfoodBuilding).style.border = "1px solid #00CC01";
        RsafeBuyBuilding(bestfoodBuilding);
    }
    }
}

function RbuyGemEfficientHousing() {
    var gemHousing = ["Mansion", "Hotel", "Resort", "Gateway", "Collector"];
    var unlockedHousing = [];
    for (var house in gemHousing) {
        if (game.buildings[gemHousing[house]].locked === 0) {
            unlockedHousing.push(gemHousing[house]);
        }
    }
    var obj = {};
    for (var house in unlockedHousing) {
        var building = game.buildings[unlockedHousing[house]];
        var cost = getBuildingItemPrice(building, "gems", false, 1);
        var ratio = cost / building.increase.by;
        obj[unlockedHousing[house]] = ratio;
        document.getElementById(unlockedHousing[house]).style.border = "1px solid #FFFFFF";
    }
    var keysSorted = Object.keys(obj).sort(function (a, b) {
            return obj[a] - obj[b];
        });
    bestBuilding = null;
    for (var best in keysSorted) {
        var max = getPageSetting('RMax' + keysSorted[best]);
        if (max === false) max = -1;
        if (game.buildings[keysSorted[best]].owned < max || max == -1) {
            bestBuilding = keysSorted[best];
            document.getElementById(bestBuilding).style.border = "1px solid #00CC00";
            break;
        }
    }
    if (smithylogic(bestBuilding, 'gems', false) && bestBuilding) {
        RsafeBuyBuilding(bestBuilding);
    }
}

var smithybought = 0;

function mostEfficientHousing() {

    //Housing
    var HousingTypes = ['Hut', 'House', 'Mansion', 'Hotel', 'Resort', 'Gateway', 'Collector'];

    // Which houses we actually want to check
    var housingTargets = [];
    for (var house of HousingTypes) {
        var maxHousing = (getPageSetting('RMax' + house) === -1 ? Infinity : getPageSetting('RMax' + house));
        if (!game.buildings[house].locked && game.buildings[house].owned < maxHousing) {
            housingTargets.push(house);
        }
    }

    var mostEfficient = {
        name: "",
        time: Infinity
    }

    for (var housing of housingTargets) {

        var worstTime = -Infinity;
        var currentOwned = game.buildings[housing].owned;
        for (var resource in game.buildings[housing].cost) {

            // Get production time for that resource
            var baseCost = game.buildings[housing].cost[resource][0];
            var costScaling = game.buildings[housing].cost[resource][1];
            var avgProduction = getPsString(resource, true);
	        if (avgProduction <= 0) avgProduction = 1;
            var housingBonus = game.buildings.Hut.increase.by;
            if (!game.buildings.Hub.locked) { housingBonus += 500;}

            // Only keep the slowest producer, aka the one that would take the longest to generate resources for
            worstTime = Math.max(baseCost * Math.pow(costScaling, currentOwned - 1) / (avgProduction * housingBonus), worstTime);
        }

        if (mostEfficient.time > worstTime) {
            mostEfficient.name = housing;
            mostEfficient.time = worstTime;
        }
    }
    if (mostEfficient.name == "") mostEfficient.name = null;

    return mostEfficient.name;
}

function RbuyBuildings() {
 
    // Storage, shouldn't be needed anymore that autostorage is lossless
    if (!game.global.autoStorage) {toggleAutoStorage(false);}
 
    //Smithy
    if (!game.buildings.Smithy.locked && canAffordBuilding('Smithy')) {
        // On quest challenge
        if (game.global.challengeActive == 'Quest') {
            if (smithybought > game.global.world) {smithybought = 0;}
 
            if (smithybought < game.global.world && (questcheck() == 7 || (RcalcHDratio() * 10 >= getPageSetting('Rmapcuntoff')))) {
                buyBuilding("Smithy", true, true, 1);
                smithybought = game.global.world;
            }
        } else {
            buyBuilding("Smithy", true, true, 1);
        }
    }
 
    //Microchip
    if (!game.buildings.Microchip.locked && canAffordBuilding('Microchip')) {
        buyBuilding('Microchip', true, true, 1);
    }
 
    //Housing
    var HousingTypes = ['Hut', 'House', 'Mansion', 'Hotel', 'Resort', 'Gateway', 'Collector'];
 
    // Which houses we actually want to check
    var housingTargets = [];
    for (var house in HousingTypes) {
        var maxHousing = (getPageSetting('RMax' + house) === -1 ? Infinity : getPageSetting('RMax' + house));
        if (!game.buildings[HousingTypes[house]].locked && game.buildings[HousingTypes[house]].owned < maxHousing) {
            housingTargets.push(house);
        }
    }
 
    var boughtHousing = false;
 
    do {
 
        boughtHousing = false;
        var housing = mostEfficientHousing();
 
        if (housing != null && canAffordBuilding(housing) && game.buildings[housing].purchased < (getPageSetting('RMax' + housing) === -1 ? Infinity : getPageSetting('RMax' + housing))) {
            buyBuilding(housing, true, true, 1);
            boughtHousing = true;
        }
    } while (boughtHousing)
 
    //Tributes
    if (!game.buildings.Tribute.locked) {
        var buyTributeCount = getMaxAffordable(Math.pow(1.05, game.buildings.Tribute.owned) * 10000, game.resources.food.owned,1.05,true);
        
        if (getPageSetting('RMaxTribute') > game.buildings.Tribute.owned) {
            buyTributeCount = Math.min(buyTributeCount, getPageSetting('RMaxTribute') - game.buildings.Tribute.owned);
        }
 	if (getPageSetting('RMaxTribute') < 0 || (getPageSetting('RMaxTribute') > game.buildings.Tribute.owned)) {
            buyBuilding('Tribute', true, true, buyTributeCount);
	}
    }
	
    //Labs
    if (!game.buildings.Laboratory.locked && getPageSetting('Rnurtureon') == true) {    
 	if (getPageSetting('RMaxLabs') < 0 || (getPageSetting('RMaxLabs') > game.buildings.Laboratory.owned)) {
            buyBuilding('Laboratory', true, true, 1);
	}
    }
 
}
