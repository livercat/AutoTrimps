//Helium

MODULES.maps = {};
MODULES.maps.NomfarmingCutoff = 10;
MODULES.maps.NomFarmStacksCutoff = [7,30,100];
MODULES.maps.SkipNumUnboughtPrestiges = 2;
MODULES.maps.UnearnedPrestigesRequired = 2;

//Psycho
MODULES.maps.forceModifier = true; //Will make elaborate attempts at keeping you at maps with the right modifier (good when farming spire or pushing)
MODULES.maps.magmaHitsSurvived = 2; //Your geneticists are frequently lagging 1-2 zones behind when speeding through magma, which is why this is important

// Dev debug
MODULES.maps.devDebug = false;

var enoughDamage = true;
var enoughHealth = true;
var skippedPrestige = false;
var shouldFarm = false;
var shouldFarmDamage = false;
var lastMapWeWereIn = null;
var preSpireFarming = false;
var spireMapBonusFarming = false;
var spireTime = 0;
var doMaxMapBonus = false;
var vanillaMAZ = false;
var fragmentsNeeded = 0;

const prestigeList = ['Supershield', 'Dagadder', 'Megamace', 'Polierarm', 'Axeidic', 'Greatersword', 'Harmbalest', 'Bootboost', 'Hellishmet', 'Pantastic', 'Smoldershoulder', 'Bestplate', 'GambesOP'];
const weaponPrestigeList = ['Dagadder', 'Megamace', 'Polierarm', 'Axeidic', 'Greatersword', 'Harmbalest'];
const metalPrestigeList = ['Dagadder', 'Megamace', 'Polierarm', 'Axeidic', 'Greatersword', 'Harmbalest', 'Bootboost', 'Hellishmet', 'Pantastic', 'Smoldershoulder', 'Bestplate', 'GambesOP'];

const voidPrefixes = Object.freeze({
    'Deadly': 10,
    'Heinous': 11,
    'Poisonous': 20,
    'Destructive': 30
});

var voidSuffixes = Object.freeze({
    'Descent': 7.077,
    'Void': 8.822,
    'Nightmare': 9.436,
    'Pit': 10.6
});

const uniqueMaps = {
    'The Block': {
        zone: 11,
        challenges: ["Scientist", "Trimp"],
        speedrun: 'blockTimed'
    },
    'The Wall': {
        zone: 15,
        challenges: [],
        speedrun: 'wallTimed'
    },
    'Dimension of Anger': {
        zone: 20,
        challenges: ["Discipline", "Metal", "Size", "Frugal", "Coordinate"],
        speedrun: 'angerTimed'
    },
    'Trimple Of Doom': {
        zone: 33,
        challenges: ["Meditate", "Anger"],
        speedrun: 'doomTimed'
    },
    'The Prison': {
        zone: 80,
        challenges: ["Electricity", "Mapocalypse"],
        speedrun: 'prisonTimed'
    },
    'Imploding Star': {
        zone: 170,
        challenges: ["Devastation"],
        speedrun: 'starTimed'
    },
    'Bionic Wonderland': {
        zone: 125,
        challenges: ["Crushed"],
        speedrun: 'bionicTimed'
    }
};

const priorities = Object.freeze({
    size: 'size',
    loot: 'loot',
    diff: 'difficulty',
    cache: 'cache mod',
    prestige: 'prestige mod',
    fa: 'fast attacks mod',
    minLevel: 'minLevel',
    baseLevel: 'baseLevel',
    optimalLevel: 'optimalLevel',
    biome: 'biome'
});
const profiles = Object.freeze({
    farming: {
        required: [
            priorities.cache
        ],
        optional: [
            priorities.biome,
            priorities.size,
            priorities.baseLevel,
            priorities.loot,
            priorities.optimalLevel,
            priorities.diff
        ],
        mods: ['cache', 'fa']
    },
    prestige: {
        required: [
            priorities.minLevel
        ],
        optional: [
            priorities.fa,
            priorities.size,
            priorities.prestige,
            priorities.diff,
            priorities.biome,
            priorities.loot
        ],
        mods: ['p', 'fa']
    },
    mapCompletion: {
        required: [
            priorities.minLevel
        ],
        optional: [
            priorities.fa,
            priorities.size,
            priorities.diff,
            priorities.biome,
            priorities.loot
        ],
        mods: ['fa']
    },
    wonders: {
        copy: 'mapCompletion'
    },
    preVoidFarming: {
        copy: 'farming'
    }
});
const cacheMods = ['lmc', 'hc', 'smc', 'lc'];

class MappingProfile {
    constructor(vmStatus, isFarming, needMetal, needPrestige, needWonder, shouldFarmLowerZone, minLevel = undefined) {
        this.mods = [];

        this.z = game.global.world;
        this.hze = getHighestLevelCleared();
        this.haveMapReducer = game.talents.mapLoot.purchased;
        this.needPrestige = needPrestige;
        this.needWonder = needWonder;

        const siphonology = game.portal.Siphonology.level;

        this.baseLevel = this.z - (this.haveMapReducer ?  1 : 0);
        let calculatedMinLevel = this.z;
        if (needPrestige) {
            this.name = 'prestige';
        } else if (needWonder) {
            this.name = 'wonders';
        } else if (isFarming) {
            calculatedMinLevel = this.z - (shouldFarmLowerZone ? 11 : siphonology);
            this.name = 'farming';
        } else {
            // default / unspecified
            calculatedMinLevel = this.z - siphonology;
            this.name = 'mapCompletion';
        }
        this.alias = this.name;

        // if we need metal, then switch to the farming priorities, but keep the original minLevel
        if (needMetal && this.name !== 'farming') {
            this.name = 'farming';
        }
        // use a more descriptive name for void map preparation
        if (this.name === 'farming' && vmStatus.prepareForVoids) {
            this.name = 'preVoidFarming';
        }

        if (this.name !== this.alias) {
            this.alias = `${capitalize(this.alias)} (${this.name})`;
        } else {
            this.alias = capitalize(this.alias);
        }

        let profile = profiles[this.name];
        if (profile.copy) {
            profile = profiles[profile.copy];
        }
        this.required = profile.required;
        this.optional = profile.optional;
        this.minLevel = minLevel || calculatedMinLevel;

        if (needMetal) {
            if (game.global.decayDone) {
                this.preferredBiome = "Plentiful";
            } else {
                this.preferredBiome = 'Mountain';
            }
        } else {
            this.preferredBiome = 'Random';
        }

        // Calculate optimal map level
        if (this.name === 'wonders') {
            this.optimalLevel = this.minLevel;
        } else {
            this.optimalLevel = Math.max(this.minLevel, 6);
            for (this.optimalLevel; this.optimalLevel < this.baseLevel; this.optimalLevel++) {
                let ratio = calcHDRatio(this.optimalLevel, "map");
                if (game.unlocks.imps.Titimp) {
                    ratio /= 2;
                }
                // Stance priority: Scryer > Dominance > X
                if (this.z >= 60 && this.hze >= 180) {
                    ratio *= 2;
                } else if (game.upgrades.Dominance.done) {
                    ratio /= 4;
                }
                // Stop increasing map level once HD ratio is too large
                if ((this.z <= 40 && ratio > 1.5) || ratio > 1.2) {
                    break;
                }
            }
            // Keep increasing map level while we can overkill
            const extraMapLevelsAvailable = this.hze >= 209;
            if (!extraMapLevelsAvailable) {
                // can't increase map levels yet
                this.optimalLevel = Math.min(this.optimalLevel, this.z);
            } else {
                if (extraMapLevelsAvailable && this.optimalLevel >= this.baseLevel) {
                    const maxOneShotCells = maxOneShotPower();
                    while (oneShotZone(this.optimalLevel + 1, "map", "S") >= maxOneShotCells) {
                        this.optimalLevel++;
                    }
                }
                if (game.global.challengeActive !== "Coordinate" && !mutations.Magma.active()) {
                    // Prefer "Oneshot level" + 1, except on magma or in Coordinated challenge
                    this.optimalLevel++;
                }
            }
            // if we have Map Reducer and there's nothing useful in the optimal map level, consider lowering it
            const canUseMapReducer = (this.optimalLevel === this.z) && (this.minLevel <= this.baseLevel);
            if (this.haveMapReducer && canUseMapReducer && !mapLevelHasPrestiges(this.optimalLevel)) {
                this.optimalLevel = this.baseLevel;
            }
        }

        for (const mod of profile.mods) {
            if (mod === 'cache') {
                // only consider the best unlocked cache mod (LMC>HC>SMC>LC)
                const unlockedCaches = cacheMods.filter(m => mapSpecialModifierConfig[m].unlocksAt <= this.hze);
                if (unlockedCaches) {
                    this.bestCacheMod = unlockedCaches[0];
                    this.mods.push(this.bestCacheMod);
                }
            } else if (mapSpecialModifierConfig[mod].unlocksAt <= this.hze) {
                this.mods.push(mod);
            }
        }
    }

    getTargetLevel(priority) {
        if (priority === priorities.minLevel) {
            return this.minLevel;
        }
        if (priority === priorities.baseLevel) {
            // base level is meaningless if it's lower than min or higher than optimal, so let's limit it
            return Math.max(this.minLevel, Math.min(this.baseLevel, this.optimalLevel));
        }
        if (priority === priorities.optimalLevel) {
            return this.optimalLevel;
        }
    }

    getTargetMod(priority) {
        let mod = '0';
        if (priority === priorities.prestige) {
            mod = 'p';
        } else if (priority === priorities.cache) {
            mod = this.bestCacheMod;
        } else if (priority === priorities.fa) {
            mod = 'fa';
        } else {
            console.log('unknown map mod ', priority);
        }
        return (this.mods.includes(mod) ? mod : '0');
    }

    selectBetterCraftedMap(map1, map2) {
        // disqualify some maps right away
        const maps = [map1, map2].filter(m => (m && m.level >= this.minLevel && m.level <= this.optimalLevel));
        if (!maps.length) {
            return undefined;
        } else if (maps.length === 1) {
            return maps[0];
        }
        // select a new map if it's strictly better
        if (getMapScore(map2, this.mods) > getMapScore(map1, this.mods)) {
            return map2;
        } else {
            return map1;
        }
    }

    getDevDebugArgs() {
        return {
            name: this.name,
            alias: this.alias,
            minLevel: this.minLevel,
            baseLevel: this.baseLevel,
            optimalLevel: this.optimalLevel,
            biome: this.preferredBiome,
            mods: `[${this.mods.map(x => (x ? x.toUpperCase() : x))}]`,
            required: `[${this.required}]`,
            optional: `[${this.optional}]`,
        }
    }
}
const sliderOptions = [
    priorities.diff,
    priorities.loot,
    priorities.size
];
const levelOptions = [
    priorities.minLevel,
    priorities.baseLevel,
    priorities.optimalLevel
];
const modOptions = [
    priorities.fa,
    priorities.cache,
    priorities.prestige
];
class MapCrafter {
    constructor(profile) {
        this.sliders = {};
        this.profile = profile;
        this.biomeSelector = document.getElementById("biomeAdvMapsSelect");
        this.modSelector = document.getElementById("advSpecialSelect");
        this.baseLevelInput = document.getElementById('mapLevelInput');
        this.extraLevelInput = document.getElementById('advExtraLevelSelect');
        this.perfectCheckbox = document.getElementById('advPerfectCheckbox');
        for (const what of ['size', 'loot', 'difficulty']) {
            this.sliders[what] = document.getElementById(what + "AdvMapsRange");
        }
    }

    setSlider(what, value) {
        this.sliders[what].value = value;
    }

    setMod(mod) {
        this.modSelector.value = mod;
    }

    setBiome(biome) {
        this.biomeSelector.value = biome;
    }

    setLevel(level) {
        // base levels are capped by zone level
        this.baseLevelInput.value = Math.min(level, this.profile.z);
        // extra levels are in range from 0 to 10
        this.extraLevelInput.value = Math.min(10, Math.max(0, level - this.profile.z));
    }

    setAffordableMod() {
        for (const modName of this.profile.mods) {
            this.modSelector.value = modName;
            if (this.canAfford()) {
                return;
            }
        }
        // can't afford any mod - reset the selector to "no bonus"
        this.modSelector.value = '0';
    }

    setAffordableLevel(minLevel, maxLevel) {
        let level = maxLevel;
        this.setLevel(level);
        while (!this.canAfford() && level > minLevel) {
            level -= 1;
            this.setLevel(level);
        }
    }

    getMod() {
        if (this.modSelector && this.modSelector.value !== '0') {
            return this.modSelector.value;
        }
    }

    canAfford() {
        return updateMapCost(true) <= game.resources.fragments.owned;
    }

    maybeUpdateFragmentsNeeded(currentMap) {
        if (this.isAnUpgradeOver(currentMap)) {
            fragmentsNeeded = updateMapCost(true);
        }
    }

    designNewMap(ctx, currentMap, highestMap) {
        devDebug(ctx, 'Designing a map to fit the profile', this.profile.getDevDebugArgs());

        // reset all map params to the lowest (cheapest) setting
        resetAdvMaps(true);
        this.setLevel(this.profile.minLevel);
        fragmentsNeeded = 0;

        // first, set all required properties of the map
        for (const req of this.profile.required) {
            if (sliderOptions.includes(req)) {
                this.setSlider(req, 9);
            } else if (levelOptions.includes(req)) {
                this.setLevel(this.profile.getTargetLevel(req));
            } else if (modOptions.includes(req)) {
                this.setMod(this.profile.getTargetMod(req));
            } else if (req === priorities.biome) {
                this.setBiome(this.profile.preferredBiome);
            } else {
                devDebug(ctx, 'Unknown map requirement', {req: req});
            }
        }
        if (!this.canAfford() && this.isAnUpgradeOver(currentMap)) {
            // it's already an upgrade, we should save up for it
            fragmentsNeeded = updateMapCost(true);
            if (currentMap) {
                // continue running an existing acceptable map until we can afford an upgrade
                return false;
            } else {
                // craft any affordable map
                resetAdvMaps(true);
                this.setAffordableLevel(this.profile.minLevel, this.profile.optimalLevel);
                this.setAffordableMod();
                return this.canAfford() && this.isAnUpgradeOver(highestMap);
            }
        }
        // otherwise, keep trying to improve the map until it's an upgrade

        currentMap = (currentMap || highestMap);
        // now we can try to improve optional parameters
        // we also try to find the map cost of the next map upgrade, so we know how much to save up
        for (const opt of this.profile.optional) {
            if (sliderOptions.includes(opt)) {
                let value = 9;
                this.setSlider(opt, value);
                if (this.canAfford() || !this.isAnUpgradeOver(currentMap)) {
                    continue;
                }
                // gradually decrement slider until we can afford it
                this.maybeUpdateFragmentsNeeded(currentMap);
                while (!this.canAfford() && value > 0) {
                    value -= 1;
                    this.setSlider(opt, value);
                    this.maybeUpdateFragmentsNeeded(currentMap);
                }
            } else if (levelOptions.includes(opt)) {
                let level = this.profile.getTargetLevel(opt);
                this.setLevel(level);
                if (this.canAfford() || !this.isAnUpgradeOver(currentMap)) {
                    continue;
                }
                // gradually decrement level until we can afford it
                this.maybeUpdateFragmentsNeeded(currentMap);
                while (!this.canAfford() && level > this.profile.minLevel) {
                    level -= 1;
                    // if we have map reducer, and there are no prestiges in the map, skip that level
                    const canUseMapReducer = (level === this.profile.z) && (level > this.profile.minLevel);
                    if (this.profile.haveMapReducer && canUseMapReducer && !mapLevelHasPrestiges(level)) {
                        level -= 1;
                    }
                    this.setLevel(level);
                    this.maybeUpdateFragmentsNeeded(currentMap);
                }
            } else if (modOptions.includes(opt)) {
                const prevMod = this.getMod();
                this.setMod(this.profile.getTargetMod(opt));
                if (this.canAfford() || !this.isAnUpgradeOver(currentMap)) {
                    continue;
                }
                this.maybeUpdateFragmentsNeeded(currentMap);
                this.setMod(prevMod);
            } else if (opt === priorities.biome) {
                this.setBiome(this.profile.preferredBiome);
                if (this.canAfford() || !this.isAnUpgradeOver(currentMap)) {
                    continue;
                }
                this.maybeUpdateFragmentsNeeded(currentMap);
                this.setBiome('Random');
            } else {
                devDebug(ctx, 'Unknown map option', {opt: opt});
            }
        }

        if (this.canAfford() && this.perfectSlidersAvailable()) {
             swapNiceCheckbox(this.perfectCheckbox, true);
             if (!this.canAfford()) {
                 swapNiceCheckbox(this.perfectCheckbox, false);
             }
        }

        this.maybeUpdateFragmentsNeeded(currentMap);
        return this.canAfford() && this.isAnUpgradeOver(currentMap);
    }

    purchase(mapToRecycle) {
        const selectedMod = this.getMod();
        const extraMapLevels = this.getExtraLevel();
        const totalMapLevel = this.getTotalLevel();
        const mapCost = updateMapCost(true);

        const modMsgs = [];
        if (selectedMod) {
            modMsgs.push(mapSpecialModifierConfig[selectedMod].name);
        }
        if (extraMapLevels) {
            modMsgs.push(`z+${extraMapLevels}`);
        }
        const ratio = (100 * (mapCost / game.resources.fragments.owned)).toFixed(2);
        const bonusMsg = (modMsgs.length > 0 ? `${modMsgs.join(', ')}` : 'no bonus');
        debug(`Buying a map: Level ${totalMapLevel} (${bonusMsg}). Cost: ${ratio}% of your fragments (${prettify(mapCost)})`, "maps", 'th-large');

        var result = buyMap();
        if (result === -2) {
            debug("Too many maps, recycling all lower-level maps", "maps", 'th-large');
            recycleBelow(true);
            result = buyMap();
            if (result === -2) {
                if (mapToRecycle) {
                    debug("Still too many maps, recycling map of the lowest level");
                    const mapIdx = game.global.mapsOwnedArray.indexOf(mapToRecycle);
                    recycleMap(mapIdx);
                    result = buyMap();
                    if (result !== -2) {
                        return;
                    }
                }
            } else {
                return;
            }
            debug("Failed to buy a map");
        }
    }

    getBaseLevel() {
        return parseInt(this.baseLevelInput.value);
    }

    getExtraLevel() {
        return getExtraMapLevels();
    }

    getTotalLevel() {
        return this.getBaseLevel() + this.getExtraLevel();
    }

    isAnUpgradeOver(existingMap) {
        if (!existingMap) {
            // any map is better than no map
            return true;
        }
        if (isCloserTo(this.getTotalLevel(), existingMap.level, this.profile.optimalLevel)) {
            // increase map level
            return true;
        }
        // add map mod if the current one is useless
        return !this.profile.mods.includes(existingMap.bonus) && this.profile.mods.includes(this.getMod());
    }

    perfectSlidersAvailable() {
        let sliderValuesArePerfect = true;
        Object.values(this.sliders).some(function(slider) {
            if (parseInt(slider.value) !== 9) {
                sliderValuesArePerfect = false;
                return false;
            }
            return true;
        });
        return sliderValuesArePerfect;
    }

    getDevDebugArgs() {
        return {
            mod: this.getMod(),
            level: this.getTotalLevel(),
            size: this.sliders['size'].value,
            loot: this.sliders['loot'].value,
            diff: this.sliders['difficulty'].value,
            biome: this.biomeSelector.value
        }
    }
}

function capitalize(s) {
    if (!s) {
        return s;
    }
    return s.charAt(0).toUpperCase() + s.slice(1);
}

function isCloserTo(v1, v2, baseline) {
    return Math.abs(baseline - v1) < Math.abs(baseline - v2);
}

function shouldRunUniqueMap(vmStatus, map) {
    const challenge = game.global.challengeActive;
    const isC2 = game.global.runningChallengeSquared;

    const mapData = uniqueMaps[map.name];
    if (mapData === undefined || game.global.world < mapData.zone || getMapRatio(vmStatus, map) > 1) {
        return false;
    }
    if (!isC2 && mapData.challenges.includes(challenge)) {
        return true;
    }
    if (mapData.speedrun && shouldSpeedRun(game.achievements[mapData.speedrun])) {
        return true;
    }

    if (map.name === 'The Block') {
        // we need Shieldblock
        if (!game.upgrades.Shieldblock.allowed && getPageSetting('BuyShieldblock')) {
            return true;
        }
    } else if (map.name === 'The Wall') {
        // we need Bounty
        if (!game.upgrades.Bounty.allowed && !game.talents.bounty.purchased) {
            return true;
        }
    } else if (map.name === 'Dimension of Anger') {
        // unlock the portal
        if (!game.talents.portal.purchased && document.getElementById("portalBtn").style.display === "none") {
            return true;
        }
    } else if (map.name === 'Trimple Of Doom') {
        if (game.portal.Relentlessness.locked) {
            // unlock the Relentlessness perk
            return true;
        }
        // maybe get the treasure
        const trimpleZ = Math.abs(getPageSetting('TrimpleZ'));
        if (trimpleZ >= 33 && game.global.world >= trimpleZ && game.mapUnlocks.AncientTreasure.canRunOnce) {
           if (getPageSetting('TrimpleZ') < 0) {
                setPageSetting('TrimpleZ', 0);
            }
           return true;
        }
    }

    return false;
}

function getVoidMapStatus() {
    const isDaily = game.global.challengeActive === 'Daily';
    const isC2 = game.global.runningChallengeSquared;
    const z = game.global.world;

    const rv = {
        prepareForVoids: false,
        runVoidsNow: false,
        voidCell: 0
    };

    // don't have any voids
    if (game.global.totalVoidMaps === 0) {
        return rv;
    }
    // running C2 and "no VMs in C2"
    if (isC2 && getPageSetting('novmsc2')) {
        return rv;
    }

    let voidCellField, voidPoisonField, voidMinField, voidMaxField;
    if (isDaily) {
        // Daily Voids
        voidCellField = 'dvoidscell';
        voidPoisonField = 'drunnewvoidspoison';
        voidMinField = 'DailyVoidMod';
        voidMaxField = 'dRunNewVoidsUntilNew';
    } else {
        // Regular Voids
        voidCellField = 'voidscell';
        voidPoisonField = 'runnewvoidspoison';
        voidMinField = 'VoidMaps';
        voidMaxField = 'RunNewVoidsUntilNew';
    }
    // What Zone Range to run Voids at
    const minVoidZone = Math.max(0, getPageSetting(voidMinField) || 0);
    if (minVoidZone === 0) {
        return rv;
    }
    let maxVoidZone = minVoidZone;
    if (!getPageSetting(voidPoisonField) || getEmpowerment() === 'Poison') {
        maxVoidZone += Math.max(0, getPageSetting(voidMaxField) || 0);
    }

    // Check zone range
    if (z < minVoidZone || z > maxVoidZone) {
        return rv;
    }

    // What cell to run Voids at
    rv.voidCell = getPageSetting(voidCellField);
    rv.voidCell = (rv.voidCell > 0 ? rv.voidCell : 90);

    const lastClearedCell = game.global.lastClearedCell;
    rv.prepareForVoids = (lastClearedCell + 1) >= Math.floor((rv.voidCell - 1) / 10) * 10;
    rv.runVoidsNow = rv.prepareForVoids && lastClearedCell + 1 >= rv.voidCell;
    return rv;
}

function isDoingSpire() {
    return isActiveSpireAT() || disActiveSpireAT();
}

function updateAutoMapsStatus(get, hdStats, vmStatus, mappingProfile) {
    if (!getPageSetting('showautomapstatus')) {
        return;
    }
    let status = 'Advancing';
    const hitsSurvived = hdStats.hitsSurvived;
    const mapsCutoff = getMapCutOff(vmStatus);
    const farmingCutoff = getFarmCutOff(vmStatus);
    const healthCutoff = getMapHealthCutOff(vmStatus);
    const automapsDisabled = getPageSetting("AutoMaps") === 0;

    if (vanillaMAZ) {
        status = "Running Vanilla MAZ";
    } else if (vmStatus.runVoidsNow) {
        const stackedMaps = (Fluffy.isRewardActive('void') ? countStackedVoidMaps() : 0);
        const stackedMsg = (stackedMaps ? ` (${stackedMaps} stacked)` : "");
        status = `Void Maps: ${game.global.totalVoidMaps}${stackedMsg} remaining`;
    } else if (game.global.mapsActive && automapsDisabled && getCurrentMapObject().level > game.global.world && getCurrentMapObject().location !== "Void" && getCurrentMapObject().location !== "Bionic") {
        status = 'Prestige Raiding';
    } else if (game.global.mapsActive && automapsDisabled && getCurrentMapObject().level > game.global.world && getCurrentMapObject().location === "Bionic") {
        status = 'BW Raiding';
    } else if (game.global.challengeActive === "Mapology" && game.challenges.Mapology.credits < 1) {
        status = 'Out of Map Credits';
    } else if (preSpireFarming) {
        const minSp = getPageSetting('MinutestoFarmBeforeSpire');
        const secs = Math.floor(60 - (spireTime * 60) % 60).toFixed(0);
        const mins = Math.floor(minSp - spireTime).toFixed(0);
        const hours = ((minSp - spireTime) / 60).toFixed(2);
        const spiretimeStr = (minSp - spireTime >= 60) ? (hours + 'h') : (mins + 'm:' + (secs >= 10 ? secs : ('0' + secs)) + 's');
        status = `Farming for Spire, ${spiretimeStr} left`;
    } else if (spireMapBonusFarming) {
        status = 'Getting Spire Map Bonus';
    } else if (getPageSetting('SkipSpires') === 1 && isDoingSpire()) {
        status = 'Skipping Spire';
    } else if (doMaxMapBonus) {
        status = 'Max Map Bonus After Zone';
    } else if (mappingProfile && mappingProfile.needPrestige) {
        status = 'Prestige';
    } else if (mappingProfile && mappingProfile.needWonder) {
        status = 'Looking for a wonder';
    } else {
        const wantedHealth = (healthCutoff / hitsSurvived).toFixed(2);
        const wantedFarmDmg = (hdStats.hdRatio / farmingCutoff).toFixed(2);
        const wantedDamage = (hdStats.hdRatio / mapsCutoff).toFixed(2);
        const nbsp = '&nbsp;';
        const msgParts = [];

        if (wantedHealth > 1) {
            msgParts.push(`${wantedHealth}x${nbsp}HP`);
        }

        if (shouldFarm && wantedFarmDmg > 1) {
            msgParts.push(`${wantedFarmDmg}x${nbsp}Dmg`);
        } else if (wantedDamage > 1) {
            msgParts.push(`${wantedDamage}x${nbsp}Dmg`);
        }

        if (msgParts.length > 0) {
            const verb = (shouldFarm ? 'Farm' : 'Want');
            status = `${verb} ${msgParts.join(' & ')}`;
        }
    }

    if (skippedPrestige) {
        status = `${status}<br><b style="font-size:.8em;color:pink;margin-top:0.2vw">Prestige Skipped</b>`;
    }
    if (automapsDisabled) {
        status = `[off] ${status}`;
    }

    //hider he/hr% status
    const getPercent = (game.stats.heliumHour.value() / (game.global.totalHeliumEarned - (game.global.heliumLeftover + game.resources.helium.owned))) * 100;
    const lifetime = (game.resources.helium.owned / (game.global.totalHeliumEarned - game.resources.helium.owned)) * 100;

    if (get) {
        return [status, getPercent, lifetime];
    } else {
        const hiderStatus = `He/hr: ${getPercent.toFixed(3)}%&nbsp;&nbsp;&nbsp;He: ${lifetime.toFixed(3)}%`;
        document.getElementById('autoMapStatus').innerHTML = status;
        document.getElementById('hiderStatus').innerHTML = hiderStatus;

        const hdMult = getPageSetting("mapcuntoff") / mapsCutoff;
        const healthDiv = healthCutoff / getPageSetting("NumHitsSurvived");
        document.getElementById("autoMapStatusTooltip").setAttribute("onmouseover",
            makeAutomapStatusTooltip(
                (mapsCutoff > 0 ? mapsCutoff * hdMult : undefined),
                (farmingCutoff > 0 ? farmingCutoff * hdMult : undefined),
                getPageSetting('MaxMapBonuslimit'),
                (healthCutoff > 0 ? healthCutoff / healthDiv : undefined),
                getPageSetting('MaxMapBonushealth'),
                (getPageSetting('FarmOnLowHealth') ? healthCutoff / healthDiv : undefined),
                hdStats.hdRatio * hdMult,
                hitsSurvived / healthDiv,
                vmStatus,
                mappingProfile)
        );
    }
}

function makeAutomapStatusTooltip(mapsCutoff, farmingCutoff, maxMapStacks, hitsSurvivedCutoff, maxHealthStacks, healthFarmingCutoff, hdRatio, hitsSurvived, vmStatus, mappingProfile) {
    const mapStacksText = (mapsCutoff && maxMapStacks ? `Will run maps to get up to <i>${maxMapStacks}</i> stacks when it's greater than <i>${prettify(mapsCutoff)}</i>.` : 'Getting map stacks for damage is <i>disabled</i>.');
    const farmingText = (farmingCutoff ? `Will farm maps when it's greater than <i>${prettify(farmingCutoff)}</i>.` : 'Farming for damage is <i>disabled</i>.');
    const healthMapStacksText = (hitsSurvivedCutoff && maxHealthStacks ? `Will run maps to get up to <i>${maxHealthStacks}</i> stacks when it's lower than <i>${prettify(hitsSurvivedCutoff)}</i>.` : 'Getting map stacks for health is <i>disabled</i>.');
    const healthFarmingText = (healthFarmingCutoff ? `Will farm maps when it's lower than <i>${prettify(healthFarmingCutoff)}</i>.` : 'Farming for health is <i>disabled</i>.');
    const simulatedEnemy = (vmStatus.prepareForVoids ? 'Cthulimp in a Void Map' : 'Turtlimp at cell 99');
    let tooltip = 'tooltip(' +
        '\"Automaps Status\", ' +
        '\"customText\", ' +
        'event, ' +
        '\"Variables that control the current state and target of Automaps.<br>' +
        'Values in <b>bold</b> are dynamically calculated based on current zone and activity.<br>' +
        'Values in <i>italics</i> are controlled via AT settings (you can change them).<br>' +
        '<br>' +
        `<b>Hits to kill (in X formation): ${prettify(hdRatio)}</b> (assuming a ${simulatedEnemy})<br>` +
        `${mapStacksText}<br>` +
        `${farmingText}<br>` +
        `<br>` +
        `<b>Hits survived: ${prettify(hitsSurvived)}</b><br>` +
        `${healthMapStacksText}<br>` +
        `${healthFarmingText}<br>`;
    if (mappingProfile) {
        tooltip += `<br>` +
            `<b>Map crafting info</b><br>` +
            `Minimum level: <b>${mappingProfile.minLevel}</b><br>` +
            `Optimal level: <b>${mappingProfile.optimalLevel}</b><br>` +
            `Mapping profile: ${mappingProfile.alias}<br>` +
            `Preferred mods: ${mappingProfile.mods.map(x => (x ? x.toUpperCase() : x)).join(', ')}<br>` +
            `Preferred biome: ${mappingProfile.preferredBiome.replace('Plentiful', 'Gardens (plentiful)')}<br>` +
            `Required map stats: ${mappingProfile.required.join(', ')}<br>` +
            `Map stats priority: ${mappingProfile.optional.join(', ')}<br>`;
        if (fragmentsNeeded) {
            tooltip += `<br>` +
                `Will try to craft a better map when we have <b>${prettify(fragmentsNeeded)}</b> fragments.`;
        }
    }
    tooltip += '\")';
    return tooltip;
}


function getMapAdjective(mapId, optimalMap, alternativeMap) {
    if (optimalMap && mapId === optimalMap.id) {
        return 'optimal';
    } else if (alternativeMap && mapId === alternativeMap.id) {
        return 'alternative';
    } else {
        return 'selected';
    }
}

function runSelectedMap(mapId, madAdjective) {
    selectMap(mapId);
    runMap();
    if (lastMapWeWereIn !== getCurrentMapObject()) {
        const map = game.global.mapsOwnedArray[getMapIndex(mapId)];
        debug(`Running ${madAdjective} map ${prettifyMap(map)}`, "maps", 'th-large');
        lastMapWeWereIn = getCurrentMapObject();
    }
}

function getMapHealthCutOff(vmStatus, pure) {
    //Base and Spire cutOffs
    let cut = getPageSetting('NumHitsSurvived');
    if (pure) {
        return cut;
    }

    //Spire
    if (game.global.spireActive) {
        return getPageSetting('SpireHitsSurvived');
    }

    //Magma
    if (mutations.Magma.active()) {
        cut *= MODULES.maps.magmaHitsSurvived;
    }

    //Void Map cut off - will ALSO scale with scryer, if scrying on void maps
    if (vmStatus.prepareForVoids) {
        if (getPageSetting("scryvoidmaps")) {
            cut *= getPageSetting('ScryerHitsMult');
        }
        return cut * getPageSetting('VoidHitsMult');
    }

    //Scryer Multiplier (only if scrying on corrupted)
    if (scryingCorruption() && game.global.challengeActive != "Domination") {
        return cut * getPageSetting('ScryerHitsMult');
    }

    return cut;
}

function getMapCutOff(vmStatus, pure) {
    let mapCutoff = getPageSetting("mapcuntoff");
    if (pure) {
        // Unaltered mapCutOff
        return mapCutoff;
    }

    if (game.global.spireActive) {
        // Spire
        return getPageSetting('SpireHD');
    }

    const mapology = game.global.challengeActive === "Mapology";
    const daily = game.global.challengeActive === "Daily";
    const c2 = game.global.runningChallengeSquared;
    const nature = getEmpowerment();

    // Mapology
    if (mapology && getPageSetting("mapc2hd") > 0) {
        mapCutoff = getPageSetting("mapc2hd");
    }

    // Windstacking
    const wind = nature === 'Wind';
    let autoStance, windMin, windCut
    if (daily) {
        autoStance = getPageSetting("AutoStance") === 3 || getPageSetting("use3daily") === true;
        windMin = getPageSetting("dWindStackingMin") > 0 && game.global.world >= getPageSetting("dWindStackingMin");
        windCut = getPageSetting("dwindcutoffmap") > 0;
    }
    else {
        autoStance = getPageSetting("AutoStance") === 3;
        windMin = getPageSetting("WindStackingMin") > 0 && game.global.world >= getPageSetting("WindStackingMin")
        windCut = getPageSetting("windcutoffmap") > 0
    }

    //Windstack
    if (wind && !c2 && autoStance && windMin && windCut) {
        mapCutoff = getPageSetting("windcutoffmap");
    }

    //Void and Scry mapCutoff off
    if (vmStatus.prepareForVoids) {
        return mapCutoff * getPageSetting('VoidHDMult');
    }
    if (scryingCorruption() && game.global.challengeActive !== "Domination") {
        return mapCutoff / getPageSetting('ScryerHDDiv');
    }

    return mapCutoff;
}

function getFarmCutOff(vmStatus) {
    //Int
    var cut = getPageSetting("DisableFarm");

    //Spire
    if (game.global.spireActive) return getPageSetting('SpireHD');

    //Void and Scry
    if (vmStatus.prepareForVoids) return cut * getPageSetting('VoidHDMult');
    if (scryingCorruption() && game.global.challengeActive != "Domination") return cut / getPageSetting('ScryerHDDiv');

    return cut;
}

function getMapRatio(vmStatus, map, customLevel, customDiff) {
    //Init
    var level = customLevel ? customLevel : map.level;
    var diff = customDiff ? customDiff : map.difficulty;

    //Calc
    var mapDmg = (calcHDRatio(level, "map") / diff) / getMapCutOff(vmStatus, true);
    var mapHp = getMapHealthCutOff(vmStatus, true) / (calcHitsSurvived(level, 'map') / diff);
    return Math.max(mapDmg, mapHp);
}

function getMapScore(map, modPool) {
    // this function is used when comparing crafted maps - the greater result means a better map
    if (!map) {
        return [-1, -1];
    }
    // mod pools are ordered from best to worst, so we invert the index to get the score
    const modScore = (modPool.length - (modPool.includes(map.bonus) ? modPool.indexOf(map.bonus) : 999));
    return [modScore, map.level];
}

function getVoidMapDifficulty(map) {
    if (!map) {
        return 99999;
    }
    let score = 0;
    for (const [prefix, weight] of Object.entries(voidPrefixes)) {
        if (map.name.includes(prefix)) {
            score += weight;
            break;
        }
    }
    for (const [suffix, weight] of Object.entries(voidSuffixes)) {
        if (map.name.includes(suffix)) {
            score += weight;
            break;
        }
    }
    return score;
}

function selectEasierVoidMap(map1, map2) {
    if (getVoidMapDifficulty(map2) > getVoidMapDifficulty(map1)) {
        return map1;
    } else {
        return map2;
    }
}

function autoMap(hdStats, vmStatus) {
    const z = game.global.world;

    // Failsafes
    vanillaMAZ = false;
    if (!game.global.mapsUnlocked || hdStats.ourDamage <= 0) {
        enoughDamage = true;
        enoughHealth = true;
        shouldFarm = false;
        return updateAutoMapsStatus(false, hdStats, vmStatus);
    }

    // No Mapology Credits
    if (game.global.challengeActive === "Mapology" && game.challenges.Mapology.credits < 1) {
        return updateAutoMapsStatus(false, hdStats, vmStatus);
    }

    //MAZ
    if (game.options.menu.mapAtZone.enabled && game.global.canMapAtZone) {
        for (const option of game.options.menu.mapAtZone.setZone) {
            if (z < option.world || z > option.through) {
                continue;
            }
            if (option.times === -1 && z !== option.world) {
                continue;
            }
            if (option.times > 0 && (z - option.world) % option.times !== 0) {
                continue;
            }
            if (option.cell === game.global.lastClearedCell + 2) {
                vanillaMAZ = true;
                break;
            }
        }

        //MAZ is active
        if (vanillaMAZ) {
            return updateAutoMapsStatus(false, hdStats, vmStatus);
        }
    }

    //Reset to defaults
    const targetPrestige = getPageSetting('Prestige');
    if (targetPrestige !== "Off" && game.options.menu.mapLoot.enabled !== 1) {
        toggleSetting('mapLoot');
    }
    while ([1, 2, 3].includes(game.options.menu.repeatUntil.enabled) && !game.global.mapsActive && !game.global.preMapsActive) {
        toggleSetting('repeatUntil');
    }
    if (game.options.menu.exitTo.enabled) {
        toggleSetting('exitTo');
    }
    if (game.options.menu.repeatVoids.enabled) {
        toggleSetting('repeatVoids');
    }

    const challSQ = game.global.runningChallengeSquared;
    const debugCtx = {
        id: generateUID(),
        module: "maps"
    }

    //Prestige
    //needPrestige = (offlineProgress.countMapItems(game.global.world) !== 0); TODO - Test this!
    let needPrestige = false;
    let minMapLevel;
    const forcePrestigeZ = getPageSetting('ForcePresZ');
    if ((forcePrestigeZ >= 0) && (game.global.world >= forcePrestigeZ)) {
        for (const p of prestigeList) {
            const prestigeUnlock = game.mapUnlocks[p];
            const pMapLevel = prestigeUnlock.last + 5;
            if (game.upgrades[p].allowed && prestigeUnlock && pMapLevel <= z) {
                minMapLevel = (minMapLevel ? Math.min(minMapLevel, pMapLevel) : pMapLevel);
                needPrestige = true;
            }
        }
    }
    if (!needPrestige && targetPrestige !== 'Off') {
        const prestigeUnlock = game.mapUnlocks[targetPrestige];
        const pMapLevel = prestigeUnlock.last + 5;
        needPrestige = game.upgrades[targetPrestige].allowed && prestigeUnlock && pMapLevel <= z;
        if (needPrestige) {
            minMapLevel = pMapLevel;
        }
    }

    //Prestige Skip 1
    skippedPrestige = false;
    if (needPrestige && getPsString("gems", true) > 0 && (getPageSetting('PrestigeSkip1_2') == 1 || getPageSetting('PrestigeSkip1_2') == 2)) {
        var numUnbought = 0;
        for (const p of metalPrestigeList) {
            if (game.upgrades[p].allowed - game.upgrades[p].done > 0)
                numUnbought++;
        }
        if (numUnbought >= MODULES.maps.SkipNumUnboughtPrestiges) {
            needPrestige = false;
            skippedPrestige = true;
        }
    }

    //Prestige Skip 2
    if ((needPrestige || skippedPrestige) && (getPageSetting('PrestigeSkip1_2') == 1 || getPageSetting('PrestigeSkip1_2') == 3)) {
        const numLeft = weaponPrestigeList.filter(prestige => game.mapUnlocks[prestige].last <= (game.global.world - 5));
        const shouldSkip = numLeft <= MODULES.maps.UnearnedPrestigesRequired;
        if (shouldSkip !== skippedPrestige) {
            needPrestige = !needPrestige;
            skippedPrestige = !skippedPrestige;
        }
    }

    //Check for Health & Damage
    enoughHealth = hdStats.hitsSurvived > getMapHealthCutOff(vmStatus);
    enoughDamage = hdStats.hdRatio < getMapCutOff(vmStatus);

    //Farming
    shouldFarm = false;
    shouldFarmDamage = hdStats.hdRatio >= getFarmCutOff(vmStatus) && !weaponCapped();

    //Only actually trigger farming after doing map bonuses
    const maxStacksForHP = game.global.challengeActive === "Daily" ? getPageSetting('dMaxMapBonushealth') : getPageSetting('MaxMapBonushealth');
    const maxStacksForDmg = getPageSetting('MaxMapBonuslimit');
    if (getPageSetting('DisableFarm') > 0 && (game.global.mapBonus >= maxStacksForDmg || enoughDamage && game.global.mapBonus >= maxStacksForHP)) {
        //Farm on Low Health
        shouldFarm = shouldFarmDamage || (getPageSetting('FarmOnLowHealth') && !enoughHealth && game.global.mapBonus >= maxStacksForHP);

        //Toggle "Repeat Until"
        if (game.options.menu.repeatUntil.enabled === 1 && shouldFarm) {
            toggleSetting('repeatUntil');
        }
    }

    let shouldDoMaps = (!enoughDamage || shouldFarm || needPrestige);
    let shouldDoHealthMaps = false;
    let shouldFarmLowerZone = false;
    if (shouldDoMaps && game.global.mapBonus >= maxStacksForDmg && !shouldFarm) {
        shouldDoMaps = false;
    } else if (game.global.mapBonus >= maxStacksForDmg && shouldFarm) {
        shouldFarmLowerZone = getPageSetting('LowerFarmingZone');
    } else if (game.global.mapBonus < maxStacksForHP && !enoughHealth && !shouldDoMaps && !needPrestige) {
        shouldDoMaps = true;
        shouldDoHealthMaps = true;
    }

    let restartVoidMap = false;
    if (game.global.challengeActive === 'Nom' && getPageSetting('FarmWhenNomStacks7')) {
        if (game.global.gridArray[99].nomStacks > MODULES.maps.NomFarmStacksCutoff[0] && game.global.mapBonus < maxStacksForDmg) {
            shouldDoMaps = true;
        }
        if (game.global.gridArray[99].nomStacks === MODULES.maps.NomFarmStacksCutoff[1]) {
            shouldFarm = (hdStats.hdRatio > MODULES.maps.NomfarmingCutoff);
            shouldDoMaps = shouldFarm;
        }
        if (!game.global.mapsActive && game.global.gridArray[game.global.lastClearedCell + 1].nomStacks >= MODULES.maps.NomFarmStacksCutoff[2]) {
            shouldFarm = (hdStats.hdRatio > MODULES.maps.NomfarmingCutoff);
            shouldDoMaps = shouldFarm;
        }
        if (game.global.mapsActive && game.global.mapGridArray[game.global.lastClearedMapCell + 1].nomStacks >= MODULES.maps.NomFarmStacksCutoff[2]) {
            shouldFarm = (hdStats.hdRatio > MODULES.maps.NomfarmingCutoff);
            if (shouldFarm) {
                shouldDoMaps = true;
                restartVoidMap = true;
            }
        }
    }

    if (shouldFarm && !needPrestige && weaponCapped()) {
        shouldFarm = false;
        if (game.global.mapBonus >= maxStacksForDmg) {
            shouldDoMaps = false;
        }
    }

    //Decay challenge
    if (decaySkipMaps()) {
        shouldDoMaps = false;
    }

    //Spire
    preSpireFarming = (isActiveSpireAT() || disActiveSpireAT()) && (spireTime = (new Date().getTime() - game.global.zoneStarted) / 1000 / 60) < getPageSetting('MinutestoFarmBeforeSpire');
    spireMapBonusFarming = getPageSetting('MaxStacksForSpire') && (isActiveSpireAT() || disActiveSpireAT()) && game.global.mapBonus < 10;
    if (preSpireFarming || spireMapBonusFarming) {
        shouldDoMaps = true;
    }

    // Map Bonus
    const maxMapBonusZ = getPageSetting('MaxMapBonusAfterZone');
    doMaxMapBonus = (maxMapBonusZ >= 0 && game.global.mapBonus < maxStacksForDmg && z >= maxMapBonusZ);
    if (doMaxMapBonus) {
        shouldDoMaps = true;
    }

    let needWonder = false;
    const forceWondersZone = getPageSetting("ExpForceWondersZone");
    if (game.global.challengeActive === "Experience" && forceWondersZone > 0 && z >= forceWondersZone && z >= game.challenges.Experience.nextWonder) {
        shouldDoMaps = true;
        minMapLevel = z;
        needWonder = true;
    }

    const isFarming = (shouldFarm || shouldFarmDamage || !enoughHealth || preSpireFarming || (vmStatus.prepareForVoids && !enoughDamage));
    const needMetal = isFarming || (!enoughHealth && !armorCapped() || !enoughDamage && !weaponCapped());

    let mappingProfile = new MappingProfile(vmStatus, isFarming, needMetal, needPrestige, needWonder, shouldFarmLowerZone, minMapLevel);
    const runUniques = (getPageSetting('AutoMaps') === 1);
    const onlyStackedVoids = getPageSetting('onlystackedvoids');

    let optimalMap = null;
    let alternativeMap = null;
    let highestMap = null;
    let lowestMap = null;
    let voidMap = null;
    let selectedMap = "world";
    const bionicPool = [];

    for (const map of game.global.mapsOwnedArray) {
        if (!map.noRecycle) {
            if (map.level === mappingProfile.optimalLevel && (mappingProfile.mods.length === 0 || map.bonus === mappingProfile.mods[0])) {
                // the best map we can possibly run, no need to craft anything else
                optimalMap = mappingProfile.selectBetterCraftedMap(optimalMap, map);
            } else {
                alternativeMap = mappingProfile.selectBetterCraftedMap(alternativeMap, map);
            }
            if (!highestMap || map.level > highestMap.level) {
                highestMap = map;
            }
            if (!lowestMap || map.level < lowestMap.level) {
                lowestMap = map;
            }
        } else {
            if (runUniques && shouldRunUniqueMap(vmStatus, map) && selectedMap === 'world') {
                selectedMap = map;
            }
            if (map.location === "Bionic") {
                bionicPool.push(map);
            }
            if (map.location === 'Void' && vmStatus.runVoidsNow && (!onlyStackedVoids || map.stacked > 0)) {
                voidMap = selectEasierVoidMap(voidMap, map);
            }
        }
    }

    if (voidMap && !restartVoidMap) {
        selectedMap = voidMap;
        shouldDoMaps = true;
    }

    //Bionic Wonderland I+ (Unlocks, RoboTrimp or Bionic Sniper)
    if (selectedMap === 'world' && bionicPool.length > 0) {
        bionicPool.sort(function (bionicA, bionicB) {return bionicA.level - bionicB.level});
        let bionicMaxLevel = 0;
        while (getMapRatio(vmStatus, undefined, 125 + 15 * bionicMaxLevel, 2.6) <= 1) {
            bionicMaxLevel += 1;
        }
        const tryBionicSniper = !game.achievements.oneOffs.finished[42] && (110 + 15 * bionicMaxLevel) >= z + 45;
        if (bionicMaxLevel > game.global.roboTrimpLevel || tryBionicSniper) {
            let bionicLevel = Math.min(bionicPool.length, bionicMaxLevel);
            if (bionicLevel > 0 && bionicPool[bionicLevel-1]) {
                selectedMap = bionicPool[bionicLevel-1];
            }
        }
    }

    //Skip Spires
    if (!preSpireFarming && getPageSetting('SkipSpires') == 1 && ((game.global.challengeActive != 'Daily' && isActiveSpireAT()) || (game.global.challengeActive == 'Daily' && disActiveSpireAT()))) {
        enoughDamage = true;
        enoughHealth = true;
        shouldFarm = false;
        shouldDoMaps = false;
    }

    // Automaps
    if ((shouldDoMaps || vmStatus.runVoidsNow || needPrestige) && selectedMap === "world") {
        if (preSpireFarming) {
            let spireMap = null;
            for (const map of game.global.mapsOwnedArray) {
                if (!map.noRecycle) {
                    spireMap = mappingProfile.selectBetterCraftedMap(spireMap, map);
                }
            }
            selectedMap = (spireMap ? spireMap : "create");
        } else if (optimalMap) {
            selectedMap = optimalMap;
        } else {
            selectedMap = "create";
        }
    }

    if ((game.global.challengeActive == 'Lead' && !challSQ) && !vmStatus.runVoidsNow && (z % 2 == 0 || game.global.lastClearedCell < 80)) {
        if (game.global.preMapsActive)
            mapsClicked();
        return updateAutoMapsStatus(false, hdStats, vmStatus);
    }

    const tryCrafting = selectedMap === "create";
    if (selectedMap === "world") {
        shouldDoMaps = false;
    }

    if (!game.global.preMapsActive && game.global.mapsActive) {
        // we're inside the map, check if we need to change the "repeat" setting

        if (selectedMap.hasOwnProperty('id') && selectedMap.id === game.global.currentMapId && !selectedMap.noRecycle && shouldDoMaps) {
            // Start with Repeat on
            if (!game.global.repeatMap) {
                repeatClicked();
            }

            let currentMapPrestiges = 0;
            let endPrestige = false;
            for (const i of [1, 2]) {
                const special = game.global.mapGridArray[game.global.mapGridArray.length - i].special;
                if (prestigeList.includes(special)) {
                    currentMapPrestiges += 1;
                    if (special === targetPrestige) {
                        endPrestige = true;
                    }
                }
            }
            if (needWonder) {
                // continue looking for a wonder
            } else if (needPrestige && currentMapPrestiges >= countPrestigesInMap()) {
                // no more prestiges left in the current map after we finish it
                repeatClicked();
            } else if (shouldDoHealthMaps && game.global.mapBonus >= (maxStacksForHP - 1)) {
                // Enough map stacks for health
                repeatClicked();
            } else if ((doMaxMapBonus || !shouldFarmDamage) && game.global.mapBonus >= (maxStacksForDmg - 1)) {
                // Enough map stacks for damage
                repeatClicked();
                doMaxMapBonus = false;
            } else if (tryCrafting && game.resources.fragments.owned >= fragmentsNeeded) {
                // Try to craft a better map
                repeatClicked();
            } else if (mapExiting) {
                // Exit the current map to raid prestiges
                repeatClicked();
            }
        } else {
            // Start with Repeat Off
            if (game.global.repeatMap) {
                repeatClicked();
            }

            // Turn it back on if we want to recreate a map, but don't have enough fragments
            if (tryCrafting && game.resources.fragments.owned < fragmentsNeeded) {
                repeatClicked();
            }

            // Force Abandon to restart void maps
            if (restartVoidMap) {
                mapsClicked(true);
            }
        }
    } else if (!game.global.preMapsActive && !game.global.mapsActive) {
        // we're in the world, check if we need to go to maps
        if (shouldDoMaps) {
            if (!game.global.switchToMaps) {
                // prepare to go to map chamber
                mapsClicked();
            }

            // consider auto abandon
            const autoAbandon = getPageSetting('PowerSaving');
            // 0: enable for various reasons
            // 1: disable
            // 2: enable for void maps only
            if (game.global.switchToMaps && autoAbandon !== 1) {
                if (vmStatus.runVoidsNow || (vmStatus.prepareForVoids && shouldFarm)) {
                    // abandon for void maps
                    mapsClicked();
                } else if (autoAbandon === 0) {
                    const haveEnoughTrimps = game.resources.trimps.realMax() <= game.resources.trimps.owned + 1;
                    if (needPrestige || needWonder || haveEnoughTrimps) {
                        mapsClicked();
                    }
                    const farmOnOddZone = ((game.global.challengeActive === 'Lead' && !challSQ) && z % 2 === 1);
                    if (shouldFarm && farmOnOddZone && game.global.lastClearedCell > 93) {
                        // farm on an easier (odd) zone in Lead before we go to the harder (even) zone
                        mapsClicked();
                    }
                }
            }
        }
    } else if (game.global.preMapsActive) {
        // we're in the maps chamber

        devDebug(debugCtx, "Map stats", {
            optimalMap: debugPrettifyMap(optimalMap),
            alternativeMap: debugPrettifyMap(alternativeMap),
            highestMap: debugPrettifyMap(highestMap),
            lowestMap: debugPrettifyMap(lowestMap),
            selectedMap: debugPrettifyMap(selectedMap),
            fragmentsNeeded: prettify(fragmentsNeeded)
        });

        if (!shouldDoMaps) {
            // exit to world
            mapsClicked();
            fragmentsNeeded = 0;
            lastMapWeWereIn = undefined;
            return updateAutoMapsStatus(false, hdStats, vmStatus);
        }
        if (!tryCrafting) {
            runSelectedMap(selectedMap.id, getMapAdjective(selectedMap.id, optimalMap, alternativeMap));
            fragmentsNeeded = 0;
            return updateAutoMapsStatus(false, hdStats, vmStatus, mappingProfile);
        }
        const currentMap = (optimalMap || alternativeMap);
        const prevFragmentsNeeded = fragmentsNeeded;
        const mapCrafter = new MapCrafter(mappingProfile);
        const shouldBuyMap = mapCrafter.designNewMap(debugCtx, currentMap, highestMap, mappingProfile);
        if (fragmentsNeeded && fragmentsNeeded <= game.resources.fragments.owned) {
            fragmentsNeeded = 0; // if we can afford this map, we don't need to save up fragments
        }

        const devDebugArgs = mapCrafter.getDevDebugArgs();
        devDebugArgs['shouldBuyMap'] = shouldBuyMap;
        devDebugArgs['fragmentsNeeded'] = prettify(fragmentsNeeded);
        devDebug(debugCtx, 'Designed a map', devDebugArgs);

        if (fragmentsNeeded && prevFragmentsNeeded !== fragmentsNeeded) {
            const totalLevel = mapCrafter.getTotalLevel();
            const mod = currentMap ? currentMap.bonus : mapCrafter.getMod();
            const currentLevel = currentMap ? Math.max(currentMap.level, totalLevel) : totalLevel;
            const wanted = [
                (mappingProfile.mods.length && mappingProfile.mods[0] !== mod ? mappingProfile.mods[0] : undefined),
                (currentLevel < mappingProfile.optimalLevel ? `+${mappingProfile.optimalLevel - currentLevel}lvl` : undefined)].filter(m => m).join(', ');
            if (wanted) {
                debug(`Will recheck map upgrades when we have ${prettify(fragmentsNeeded)} fragments (want: ${wanted})`,
                "maps", 'th-large');
            }
        }

        if (shouldBuyMap) {
            const mapToRecycleIfBuyingFails = lowestMap;
            mapCrafter.purchase(mapToRecycleIfBuyingFails);
        } else if (currentMap) {
            runSelectedMap(currentMap.id, getMapAdjective(currentMap.id, optimalMap, alternativeMap));
        } else {
            debug(`Can't afford the map we designed, Level ${mapCrafter.getTotalLevel()}`, "maps", '*crying2');
            debug(`...selected our highest map instead: ${prettifyMap(highestMap)}`, "maps", '*happy2');
            runSelectedMap(highestMap.id, 'highest');
        }
    }

    const runningMap = getCurrentMapObject();
    if (!shouldDoMaps || (runningMap && runningMap.noRecycle)) {
        mappingProfile = undefined;
    }
    return updateAutoMapsStatus(false, hdStats, vmStatus, mappingProfile);
}

//Radon

MODULES.maps.RMapTierZone = [72, 47, 16];
MODULES.maps.RMapTier0Sliders = [9, 9, 9, "Mountain"];
MODULES.maps.RMapTier1Sliders = [9, 9, 9, "Depths"];
MODULES.maps.RMapTier2Sliders = [9, 9, 9, "Random"];
MODULES.maps.RMapTier3Sliders = [9, 9, 9, "Random"];
MODULES.maps.RshouldFarmCell = 59;
MODULES.maps.RSkipNumUnboughtPrestiges = 2;
MODULES.maps.RUnearnedPrestigesRequired = 2;

var RdoVoids = !1;
var RneedToVoid = !1;
var RneedPrestige = !1;
var RskippedPrestige = !1;
var RshouldDoMaps = !1;
var RmapTimeEstimate = 0;
var RlastMapWeWereIn = null;
var RdoMaxMapBonus = !1;
var RvanillaMapatZone = !1;
var Rtimefarm = !1;
var RadditionalCritMulti = 2 < getPlayerCritChance() ? 25 : 5;
var Rshouldtimefarm = !1;
var Rshouldtimefarmbogs = !1;
var Rshoulddobogs = false;
var Rshoulddopraid = false;
var Rshoulddoquest = false;
var Rquestequalityscale = false;
var Rquestshieldzone = 0;
var RAMPpMap1 = undefined;
var RAMPpMap2 = undefined;
var RAMPpMap3 = undefined;
var RAMPpMap4 = undefined;
var RAMPpMap5 = undefined;
var RAMPfragmappy = undefined;
var RAMPrepMap1 = undefined;
var RAMPrepMap2 = undefined;
var RAMPrepMap3 = undefined;
var RAMPrepMap4 = undefined;
var RAMPrepMap5 = undefined;
var RAMPprefragmappy = undefined;
var RAMPmapbought1 = false;
var RAMPmapbought2 = false;
var RAMPmapbought3 = false;
var RAMPmapbought4 = false;
var RAMPmapbought5 = false;
var RAMPfragmappybought = false;
var RAMPdone = false;
var RAMPfragfarming = false;
var Rshouldmayhem = 0;
var Rmayhemextraglobal = -1;
var Rinsanityfarm = !1;
var Rshouldinsanityfarm = !1;
var Rinsanityfragfarming = false;
var insanityfragmappy = undefined;
var insanityprefragmappy = undefined;
var insanityfragmappybought = false;
var Rstormfarm = !1;
var Rshouldstormfarm = !1;
var Requipfarm = !1;
var Rshouldequipfarm = !1;
var Requipminusglobal = -1;
var Rshipfarm = !1;
var Rshouldshipfarm = !1;
var Rshipfragfarming = false;
var shipfragmappy = undefined;
var shipprefragmappy = undefined;
var shipfragmappybought = false;


function RupdateAutoMapsStatus(get) {

    var status;

    //Fail Safes
    if (getPageSetting('RAutoMaps') == 0) status = 'Off';

    else if (Rshouldshipfarm) status = 'Ship Farming';
    else if (Rshouldequipfarm) status = 'Equip Farming to ' + equipfarmdynamicHD().toFixed(2) + " and " + estimateEquipsForZone()[2] + " Equality";
    else if (Rshouldstormfarm) status = 'Storm Farming to ' + stormdynamicHD().toFixed(2);
    else if (Rshouldinsanityfarm) status = 'Insanity Farming';
    else if (Rshouldmayhem == 1) status = 'Mayhem Attack';
    else if (Rshouldmayhem == 2) status = 'Mayhem Health';
    else if (Rshoulddopraid) status = 'Praiding';
    else if (Rshoulddoquest) status = 'Questing';
    else if (Rshouldtimefarm) status = 'Time Farming';
    else if (Rshouldtimefarmbogs) status = 'Time Farming Bogs';
    else if (Rshoulddobogs) status = 'Black Bogs';
    else if (RdoMaxMapBonus) status = 'Max Map Bonus After Zone';
    else if (!game.global.mapsUnlocked) status = '&nbsp;';
    else if (RneedPrestige && !RdoVoids) status = 'Prestige';
    else if (RdoVoids) {
	    var stackedMaps = Fluffy.isRewardActive('void') ? countStackedVoidMaps() : 0;
	    status = 'Void Maps: ' + game.global.totalVoidMaps + ((stackedMaps) ? " (" + stackedMaps + " stacked)" : "") + ' remaining';
    }
    else if (RshouldFarm && !RdoVoids) status = 'Farming: ' + RcalcHDratio().toFixed(4) + 'x';
    else if (!RenoughHealth && !RenoughDamage) status = 'Want Health & Damage';
    else if (!RenoughDamage) status = 'Want ' + RcalcHDratio().toFixed(4) + 'x &nbspmore damage';
    else if (!RenoughHealth) status = 'Want more health';
    else if (RenoughHealth && RenoughDamage) status = 'Advancing';

    if (RskippedPrestige)
        status += '<br><b style="font-size:.8em;color:pink;margin-top:0.2vw">Prestige Skipped</b>';

    var getPercent = (game.stats.heliumHour.value() / (game.global.totalRadonEarned - (game.global.radonLeftover + game.resources.radon.owned))) * 100;
    var lifetime = (game.resources.radon.owned / (game.global.totalRadonEarned - game.resources.radon.owned)) * 100;
    var hiderStatus = 'Rn/hr: ' + getPercent.toFixed(3) + '%<br>&nbsp;&nbsp;&nbsp;Rn: ' + lifetime.toFixed(3) + '%';

    if (get) {
        return [status, getPercent, lifetime];
    } else {
        document.getElementById('autoMapStatus').innerHTML = status;
        document.getElementById('hiderStatus').innerHTML = hiderStatus;
    }
}



function RautoMap() {

    //Quest
    var Rquestfarming = false;
    Rshoulddoquest = false;
    Rquestfarming = (game.global.world > 5 && game.global.challengeActive == "Quest" && questcheck() > 0);

    if (Rquestfarming) {
        if (questcheck() == 3) Rshoulddoquest = 3;
        else if (questcheck() == 4 && RcalcHDratio() > 0.95 && (((new Date().getTime() - game.global.zoneStarted) / 1000 / 60) < 121)) Rshoulddoquest = 4;
        else if (questcheck() == 6) Rshoulddoquest = 6;
        else if (questcheck() == 7 && !canAffordBuilding('Smithy')) Rshoulddoquest = 7;
        else if (questcheck() == 10 || questcheck() == 20) Rshoulddoquest = 10;
        else if (questcheck() == 11 || questcheck() == 21) Rshoulddoquest = 11;
        else if (questcheck() == 12 || questcheck() == 22) Rshoulddoquest = 12;
        else if (questcheck() == 13 || questcheck() == 23) Rshoulddoquest = 13;
        else if (questcheck() == 14 || questcheck() == 24) Rshoulddoquest = 14;
    }

    //Failsafes
    if (!game.global.mapsUnlocked || RcalcOurDmg("avg", false, true) <= 0 || Rshoulddoquest == 6) {
        RenoughDamage = true;
        RenoughHealth = true;
        RshouldFarm = false;
        RupdateAutoMapsStatus();
        return;
    }

    //Vars
    var mapenoughdamagecutoff = getPageSetting("Rmapcuntoff");
    if (game.global.repeatMap == true && !game.global.mapsActive && !game.global.preMapsActive) repeatClicked();
    if ((game.options.menu.repeatUntil.enabled == 1 || game.options.menu.repeatUntil.enabled == 2 || game.options.menu.repeatUntil.enabled == 3) && !game.global.mapsActive && !game.global.preMapsActive) toggleSetting('repeatUntil');
    if (game.options.menu.exitTo.enabled != 0) toggleSetting('exitTo');
    if (game.options.menu.repeatVoids.enabled != 0) toggleSetting('repeatVoids');
    var hitsSurvived = 10;
    if (getPageSetting("Rhitssurvived") > 0) hitsSurvived = getPageSetting("Rhitssurvived");

    //Void Vars
    var voidMapLevelSetting = 0;
    var voidMapLevelSettingCell = ((getPageSetting('Rvoidscell') > 0) ? getPageSetting('Rvoidscell') : 70);
    var voidMapLevelPlus = 0;
    if (game.global.challengeActive != "Daily" && getPageSetting('RVoidMaps') > 0) {
        voidMapLevelSetting = getPageSetting('RVoidMaps');
    }
    if (game.global.challengeActive == "Daily" && getPageSetting('RDailyVoidMod') >= 1) {
        voidMapLevelSetting = getPageSetting('RDailyVoidMod');
    }
    if (getPageSetting('RRunNewVoidsUntilNew') != 0 && game.global.challengeActive != "Daily") {
        voidMapLevelPlus = getPageSetting('RRunNewVoidsUntilNew');
    }
    if (getPageSetting('RdRunNewVoidsUntilNew') != 0 && game.global.challengeActive == "Daily") {
        voidMapLevelPlus = getPageSetting('RdRunNewVoidsUntilNew');
    }

    RneedToVoid = (voidMapLevelSetting > 0 && game.global.totalVoidMaps > 0 && game.global.lastClearedCell + 1 >= voidMapLevelSettingCell &&
        (
            (game.global.world == voidMapLevelSetting) ||
            (voidMapLevelPlus < 0 && game.global.world >= voidMapLevelSetting) ||
            (voidMapLevelPlus > 0 && game.global.world >= voidMapLevelSetting && game.global.world <= (voidMapLevelSetting + voidMapLevelPlus))
        )
    );

    var voidArrayDoneS = [];
    if (game.global.challengeActive != "Daily" && getPageSetting('Ronlystackedvoids') == true) {
        for (var mapz in game.global.mapsOwnedArray) {
            var theMapz = game.global.mapsOwnedArray[mapz];
            if (theMapz.location == 'Void' && theMapz.stacked > 0) {
                voidArrayDoneS.push(theMapz);
            }
        }
    }

    if (
        (game.global.totalVoidMaps <= 0) ||
        (!RneedToVoid) ||
        (getPageSetting('Rnovmsc2') == true && game.global.runningChallengeSquared) ||
        (game.global.challengeActive != "Daily" && game.global.totalVoidMaps > 0 && getPageSetting('Ronlystackedvoids') == true && voidArrayDoneS.length < 1)
    ) {
        RdoVoids = false;
    }

    //Calc
    var ourBaseDamage = RcalcOurDmg("avg", false, true);
    var enemyDamage = RcalcBadGuyDmg(null, RgetEnemyMaxAttack(game.global.world, 50, 'Snimp', 1.0));
    var enemyHealth = RcalcEnemyHealth(game.global.world);

    if (getPageSetting('RDisableFarm') > 0) {
        RshouldFarm = (RcalcHDratio() >= getPageSetting('RDisableFarm'));
        if (game.options.menu.repeatUntil.enabled == 1 && RshouldFarm)
            toggleSetting('repeatUntil');
    }
    RenoughHealth = (RcalcOurHealth() > (hitsSurvived * enemyDamage));
    RenoughDamage = (RcalcHDratio() <= mapenoughdamagecutoff);
    RupdateAutoMapsStatus();

    //Quest Shield
    if (game.global.world < 6 && (Rquestshieldzone != 0 || Rquestequalityscale != false)) {
        Rquestshieldzone = 0;
        Rquestequalityscale = false;
    }
    if (Rquestfarming && questcheck() == 5 && ((game.global.soldierEnergyShieldMax / enemyDamage) < RcalcHDratio()) && game.portal.Equality.scalingActive && !game.global.mapsActive) {
        toggleEqualityScale();
        Rquestshieldzone = game.global.world;
        Rquestequalityscale = true;
    }
    if (game.global.world > 5 && game.global.challengeActive == "Quest" && Rquestshieldzone > 0 && !game.portal.Equality.scalingActive && game.global.world > Rquestshieldzone && Rquestequalityscale) {
        toggleEqualityScale();
        Rquestequalityscale = false;
    }

    //Farming
    var selectedMap = "world";
    RshouldDoMaps = false;
    Rshouldtimefarm = false;
    Rshouldtimefarmbogs = false;
    Rshouldinsanityfarm = false;
    Rshouldstormfarm = false;
    Rshouldequipfarm = false;
    Rshouldshipfarm = false;
    if (ourBaseDamage > 0) {
        RshouldDoMaps = (!RenoughDamage || RshouldFarm);
    }
    var shouldDoHealthMaps = false;
    if (game.global.mapBonus >= getPageSetting('RMaxMapBonuslimit') && !RshouldFarm)
        RshouldDoMaps = false;
    else if (game.global.mapBonus < getPageSetting('RMaxMapBonushealth') && !RenoughHealth && !RshouldDoMaps) {
        RshouldDoMaps = true;
        shouldDoHealthMaps = true;
    }
    var restartVoidMap = false;

    //Map Bonus
    var maxMapBonusZ = getPageSetting('RMaxMapBonusAfterZone');
    RdoMaxMapBonus = (maxMapBonusZ >= 0 && game.global.mapBonus < getPageSetting("RMaxMapBonuslimit") && game.global.world >= maxMapBonusZ);
    if (RdoMaxMapBonus) {
        RshouldDoMaps = true;
    }

    //Maps
    RvanillaMapatZone = (game.options.menu.mapAtZone.enabled && game.global.canMapAtZone);
    if (RvanillaMapatZone) {
        for (var x = 0; x < game.options.menu.mapAtZone.setZoneU2.length; x++) {
            if (game.global.world == game.options.menu.mapAtZone.setZoneU2[x].world)
                RshouldDoMaps = true;
        }
    }

    //Time Farm
	if (getPageSetting('Rtimefarm') == true) {
		var timefarmcell;
		timefarmcell = ((getPageSetting('Rtimefarmcell') > 0) ? getPageSetting('Rtimefarmcell') : 1);
		Rtimefarm = (getPageSetting('Rtimefarm') == true && ((timefarmcell <= 1) || (timefarmcell > 1 && (game.global.lastClearedCell + 1) >= timefarmcell)) && game.global.world > 5 && (game.global.challengeActive != "Daily" && getPageSetting('Rtimefarmzone')[0] > 0 && getPageSetting('Rtimefarmtime')[0] > 0));
		if (Rtimefarm) {
			var timefarmzone;
			var timefarmtime;
			var time = ((new Date().getTime() - game.global.zoneStarted) / 1000 / 60);

			timefarmzone = getPageSetting('Rtimefarmzone');
			timefarmtime = getPageSetting('Rtimefarmtime');

			var timefarmindex = timefarmzone.indexOf(game.global.world);
			var timezones = timefarmtime[timefarmindex];

			if (getPageSetting('Rtimefarmtribute') == true) {
				time = game.buildings.Tribute.owned
			}

			if (game.global.challengeActive == "Quagmire" && getPageSetting('Rtimefarmbog') == true && timefarmzone.includes(70) && game.global.world == 70 && timezones > time) {
				Rshouldtimefarmbogs = true;
			} else if (timefarmzone.includes(game.global.world) && timezones > time) {
				Rshouldtimefarm = true;
			}

			if (game.global.challengeActive == "Quagmire" && getPageSetting('Rtimefarmbog') == true && timefarmzone.includes(70) && game.global.world == 70 && game.global.mapsActive && game.global.mapsOwnedArray[getMapIndex(game.global.currentMapId)].name == "The Black Bog" && (Rshouldtimefarmbogs && game.global.lastClearedMapCell >= 140 || timezones <= time)) {
				mapsClicked(true);
			}
		}
	}

    //Bogs
	if (game.global.challengeActive == "Quagmire") {
		var Rdobogs = false;
		Rshoulddobogs = false;
		Rdobogs = (game.global.world > 5 && (game.global.challengeActive == "Quagmire" && getPageSetting('Rblackbog') == true && getPageSetting('Rblackbogzone')[0] > 0 && getPageSetting('Rblackbogamount')[0] > 0));
		if (Rdobogs) {
			var bogzone = getPageSetting('Rblackbogzone');
			var bogamount = getPageSetting('Rblackbogamount');
			var bogindex = bogzone.indexOf(game.global.world);
			var stacks = 100;
			var stacksum = 0;

			for (var i = 0; i < (bogindex + 1); i++) {
				stacksum += parseInt(bogamount[i]);
			}

			var totalstacks = stacks - stacksum;

			if (bogzone.includes(game.global.world) && game.challenges.Quagmire.motivatedStacks > totalstacks) {
				Rshoulddobogs = true;
			}
		}
	}

    //Praid
    var Rdopraid = false;
    Rshoulddopraid = false;
    Rdopraid = (game.global.world > 5 && (getPageSetting('RAMPraid') == true && getPageSetting('RAMPraidzone')[0] > 0 && getPageSetting('RAMPraidraid')[0] > 0));
    if (Rdopraid) {
        var praidzone = getPageSetting('RAMPraidzone');
        var raidzone = getPageSetting('RAMPraidraid');

        var praidindex = praidzone.indexOf(game.global.world);
        var raidzones = raidzone[praidindex];

        var cell;
        cell = ((getPageSetting('RAMPraidcell') > 0) ? getPageSetting('RPraidingcell') : 1);

        if (praidzone.includes(game.global.world) && ((cell <= 1) || (cell > 1 && (game.global.lastClearedCell + 1) >= cell)) && Rgetequips(raidzones, false) > 0) {
            Rshoulddopraid = true;
        }
    }
	if (!Rshoulddopraid && (RAMPrepMap1 != undefined || RAMPrepMap2 != undefined || RAMPrepMap3 != undefined || RAMPrepMap4 != undefined || RAMPrepMap5 != undefined)) {

		RAMPpMap1 = undefined;
		RAMPpMap2 = undefined;
		RAMPpMap3 = undefined;
		RAMPpMap4 = undefined;
		RAMPpMap5 = undefined;
		RAMPfragmappy = undefined;
		RAMPprefragmappy = undefined;
		RAMPmapbought1 = false;
		RAMPmapbought2 = false;
		RAMPmapbought3 = false;
		RAMPmapbought4 = false;
		RAMPmapbought5 = false;
		RAMPfragmappybought = false;

		if (RAMPrepMap1 != undefined) {
			if (getPageSetting('RAMPraidrecycle') == true) {
				recycleMap(getMapIndex(RAMPrepMap1));
			}
			RAMPrepMap1 = undefined;
		}
		if (RAMPrepMap2 != undefined) {
			if (getPageSetting('RAMPraidrecycle') == true) {
				recycleMap(getMapIndex(RAMPrepMap2));
			}
			RAMPrepMap2 = undefined;
		}
		if (RAMPrepMap3 != undefined) {
			if (getPageSetting('RAMPraidrecycle') == true) {
				recycleMap(getMapIndex(RAMPrepMap3));
			}
			RAMPrepMap3 = undefined;
		}
		if (RAMPrepMap4 != undefined) {
			if (getPageSetting('RAMPraidrecycle') == true) {
				recycleMap(getMapIndex(RAMPrepMap4));
			}
			RAMPrepMap4 = undefined;
		}
		if (RAMPrepMap5 != undefined) {
			if (getPageSetting('RAMPraidrecycle') == true) {
				recycleMap(getMapIndex(RAMPrepMap5));
			}
			RAMPrepMap5 = undefined;
		}
    }

    //Mayhem
	if (game.global.challengeActive == "Mayhem") {
		var Rdomayhem = false;
		Rshouldmayhem = 0;
		Rdomayhem = (game.global.world > 5 && game.global.challengeActive == "Mayhem" && getPageSetting('Rmayhemon') == true && (getPageSetting('Rmayhemhealth') == true || getPageSetting('Rmayhemattack') == true));
		if (Rdomayhem) {
			var hits = (getPageSetting('Rmayhemacut') > 0) ? getPageSetting('Rmayhemabcut') : 100;
			var hitssurv = (getPageSetting('Rmayhemhcut') > 0) ? getPageSetting('Rmayhemhcut') : 1;
			if (game.challenges.Mayhem.stacks > 0 && getPageSetting('Rmayhemattack') == true && (RcalcHDratio() > hits)) {
				Rshouldmayhem = 1;
			}
			if (game.challenges.Mayhem.stacks > 0 && getPageSetting('Rmayhemhealth') == true && (RcalcOurHealth() < (hitssurv * enemyDamage))) {
				Rshouldmayhem = 2;
			}
		}

		var mayhemextra = 0;
		if (Rshouldmayhem > 0 && getPageSetting('Rmayhemmap') == 2) {
			mayhemextra = 0;
			var hitsmap = (getPageSetting('Rmayhemamcut') > 0) ? getPageSetting('Rmayhemamcut') : 100;
			var hitssurv = (getPageSetting('Rmayhemhcut') > 0) ? getPageSetting('Rmayhemhcut') : 1;
			var mlevels = 6;
			var go = false;
			if (
				(((RcalcEnemyHealth(game.global.world + mlevels) / game.challenges.Mayhem.getBossMult())) <= (RcalcOurDmg("avg", false, true) * (hitsmap * (mlevels + 1)))) &&
				((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) / game.challenges.Mayhem.getBossMult() * 1.3) * (hitssurv)) <= (RcalcOurHealth() * 2))
			) {
				mayhemextra = mlevels;
				go = true;
			} if (!go) {
				mlevels = 5;
				if (
					(((RcalcEnemyHealth(game.global.world + mlevels) / game.challenges.Mayhem.getBossMult())) <= (RcalcOurDmg("avg", false, true) * (hitsmap * (mlevels + 1)))) &&
					((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) / game.challenges.Mayhem.getBossMult() * 1.3) * (hitssurv)) <= (RcalcOurHealth() * 2))
				) {
					mayhemextra = mlevels;
					go = true;
				}
			} if (!go) {
				mlevels = 4;
				if (
					(((RcalcEnemyHealth(game.global.world + mlevels) / game.challenges.Mayhem.getBossMult())) <= (RcalcOurDmg("avg", false, true) * (hitsmap * (mlevels + 1)))) &&
					((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) / game.challenges.Mayhem.getBossMult() * 1.3) * (hitssurv)) <= (RcalcOurHealth() * 2))
				) {
					mayhemextra = mlevels;
					go = true;
				}
			} if (!go) {
				mlevels = 3;
				if (
					(((RcalcEnemyHealth(game.global.world + mlevels) / game.challenges.Mayhem.getBossMult())) <= (RcalcOurDmg("avg", false, true) * (hitsmap * (mlevels + 1)))) &&
					((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) / game.challenges.Mayhem.getBossMult() * 1.3) * (hitssurv)) <= (RcalcOurHealth() * 2))
				) {
					mayhemextra = mlevels;
					go = true;
				}
			} if (!go) {
				mlevels = 2;
				if (
					(((RcalcEnemyHealth(game.global.world + mlevels) / game.challenges.Mayhem.getBossMult())) <= (RcalcOurDmg("avg", false, true) * (hitsmap * (mlevels + 1)))) &&
					((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) / game.challenges.Mayhem.getBossMult() * 1.3) * (hitssurv)) <= (RcalcOurHealth() * 2))
				) {
					mayhemextra = mlevels;
					go = true;
				}
			} if (!go) {
				mlevels = 1;
				if (
					(((RcalcEnemyHealth(game.global.world + mlevels) / game.challenges.Mayhem.getBossMult())) <= (RcalcOurDmg("avg", false, true) * (hitsmap * (mlevels + 1)))) &&
					((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) / game.challenges.Mayhem.getBossMult() * 1.3) * (hitssurv)) <= (RcalcOurHealth() * 2))
				) {
					mayhemextra = mlevels;
					go = true;
				}
			} if (!go) {
				mayhemextra = 0;
				go = true;
			}
		}
	}

	//Insanity Farm
	if (game.global.challengeActive == "Insanity") {
		var insanityfarmcell;
		insanityfarmcell = ((getPageSetting('Rinsanityfarmcell') > 0) ? getPageSetting('Rinsanityfarmcell') : 1);
		Rinsanityfarm = (getPageSetting('Rinsanityon') == true && ((insanityfarmcell <= 1) || (insanityfarmcell > 1 && (game.global.lastClearedCell + 1) >= insanityfarmcell)) && game.global.world > 5 && (game.global.challengeActive == "Insanity" && getPageSetting('Rinsanityfarmzone')[0] > 0 && getPageSetting('Rinsanityfarmstack')[0] > 0));
		if (Rinsanityfarm) {
			var insanityfarmzone;
			var insanityfarmstacks;
			var insanitystacks = game.challenges.Insanity.insanity;
			var maxinsanity = game.challenges.Insanity.maxInsanity;

			insanityfarmzone = getPageSetting('Rinsanityfarmzone');
			insanityfarmstacks = getPageSetting('Rinsanityfarmstack');

			var insanitystacksfarmindex = insanityfarmzone.indexOf(game.global.world);
			var insanitystackszones = insanityfarmstacks[insanitystacksfarmindex];
			if (insanitystackszones > maxinsanity) {
				insanitystackszones = maxinsanity;
			}

			if (insanityfarmzone.includes(game.global.world) && insanitystackszones != insanitystacks) {
				Rshouldinsanityfarm = true;
			}
		}

		if (!Rshouldinsanityfarm) {
			insanityfragmappy = undefined;
			insanityprefragmappy = undefined;
			insanityfragmappybought = false;
		}
	}

	//Storm
	if (game.global.challengeActive == "Storm") {
		Rstormfarm = (getPageSetting('Rstormon') == true && game.global.world > 5 && (game.global.challengeActive == "Storm" && getPageSetting('Rstormzone') > 0 && getPageSetting('RstormHD') > 0 && getPageSetting('Rstormmult') > 0));
		if (Rstormfarm) {
			var stormzone = getPageSetting('Rstormzone');
			var stormHD = getPageSetting('RstormHD');
			var stormmult = getPageSetting('Rstormmult');
			var stormHDzone = (game.global.world - stormzone);
			var stormHDmult = (stormHDzone == 0) ? stormHD : Math.pow(stormmult, stormHDzone) * stormHD;

			if (game.global.world >= stormzone && RcalcHDratio() > stormHDmult) {
				Rshouldstormfarm = true;
			}
		}
	}

    //Ship Farm
	if (game.jobs.Worshipper.locked == 0) {
		var shipfarmcell;
		shipfarmcell = ((getPageSetting('Rshipfarmcell') > 0) ? getPageSetting('Rshipfarmcell') : 1);
		Rshipfarm = (game.jobs.Worshipper.locked == 0 && getPageSetting('Rshipfarmon') == true && ((shipfarmcell <= 1) || (shipfarmcell > 1 && (game.global.lastClearedCell + 1) >= shipfarmcell)) && game.global.world > 5 && (getPageSetting('Rshipfarmzone')[0] > 0 && getPageSetting('Rshipfarmamount')[0] > 0));
		if (Rshipfarm) {
			var shipfarmzone;
			var shipfarmamount;
			var ships = game.jobs.Worshipper.owned

			shipfarmzone = getPageSetting('Rshipfarmzone');
			shipfarmamount = getPageSetting('Rshipfarmamount');

			var shipamountfarmindex = shipfarmzone.indexOf(game.global.world);
			var shipamountzones = shipfarmamount[shipamountfarmindex];

			if (shipfarmzone.includes(game.global.world) && shipamountzones > ships) {
				Rshouldshipfarm = true;
			}
		}

		if (!Rshouldshipfarm) {
			shipfragmappy = undefined;
			shipprefragmappy = undefined;
			shipfragmappybought = false;
		}
	}

    //Equip Farming
    Requipfarm = (getPageSetting('Requipfarmon') == true && game.global.world > 5 && (getPageSetting('Requipfarmzone') > 0 && getPageSetting('RequipfarmHD') > 0 && getPageSetting('Requipfarmmult') > 0));
    if (Requipfarm) {
	var equipfarmzone = getPageSetting('Requipfarmzone');
	var metal = game.resources.metal.owned
        var metalneeded = estimateEquipsForZone()[0];

        if (game.global.world >= equipfarmzone && metal < metalneeded) {
            Rshouldequipfarm = true;
        }
    }

    var equipminus = 0;
    if (Rshouldequipfarm) {
        equipminus = 0;
        var hits = (getPageSetting('Requipfarmhits') > 0) ? getPageSetting('Requipfarmhits') : 10;
        var hitssurv = (getPageSetting('Rhitssurvived') > 0) ? getPageSetting('Rhitssurvived') : 1;
        var mlevels = 0;
        var go = false;
        if (
            ((RcalcEnemyHealth(game.global.world + mlevels)) <= (RcalcOurDmg("avg", false, true) * hits)) &&
            ((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) * 0.8) * (hitssurv)) <= (RcalcOurHealth() * 2))
        ) {
            equipminus = mlevels;
            go = true;
        } if (!go) {
            mlevels = -1;
            if (
                ((RcalcEnemyHealth(game.global.world + mlevels)) <= (RcalcOurDmg("avg", false, true) * hits)) &&
                ((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) * 0.8) * (hitssurv)) <= (RcalcOurHealth() * 2))
            ) {
                equipminus = mlevels;
                go = true;
            }
        } if (!go) {
            mlevels = -2;
            if (
                ((RcalcEnemyHealth(game.global.world + mlevels)) <= (RcalcOurDmg("avg", false, true) * hits)) &&
                ((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) * 0.8) * (hitssurv)) <= (RcalcOurHealth() * 2))
            ) {
                equipminus = mlevels;
                go = true;
            }
        } if (!go) {
            mlevels = -3;
            if (
                ((RcalcEnemyHealth(game.global.world + mlevels)) <= (RcalcOurDmg("avg", false, true) * hits)) &&
                ((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) * 0.8) * (hitssurv)) <= (RcalcOurHealth() * 2))
            ) {
                equipminus = mlevels;
                go = true;
            }
        } if (!go) {
            mlevels = -4;
            if (
                ((RcalcEnemyHealth(game.global.world + mlevels)) <= (RcalcOurDmg("avg", false, true) * hits)) &&
                ((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) * 0.8) * (hitssurv)) <= (RcalcOurHealth() * 2))
            ) {
                equipminus = mlevels;
                go = true;
            }
        } if (!go) {
            mlevels = -5;
            if (
                ((RcalcEnemyHealth(game.global.world + mlevels)) <= (RcalcOurDmg("avg", false, true) * hits)) &&
                ((((RcalcBadGuyDmg(null, RgetEnemyMaxAttack((game.global.world + mlevels), 20, 'Snimp', 1.0))) * 0.8) * (hitssurv)) <= (RcalcOurHealth() * 2))
            ) {
                equipminus = mlevels;
                go = true;
            }
        } if (!go) {
            equipminus = -6;
            go = true;
        }
    }

    //Map Selection
    var obj = {};
    for (var map in game.global.mapsOwnedArray) {
        if (!game.global.mapsOwnedArray[map].noRecycle) {
            obj[map] = game.global.mapsOwnedArray[map].level;
        }
    }
    var keysSorted = Object.keys(obj).sort(function(a, b) {
        return obj[b] - obj[a];
    });
    var highestMap;
    var lowestMap;
    if (keysSorted[0]) {
        highestMap = keysSorted[0];
        lowestMap = keysSorted[keysSorted.length - 1];
    } else
        selectedMap = "create";

    //Uniques
    var runUniques = (getPageSetting('RAutoMaps') == 1);
    if (runUniques || Rshoulddobogs || Rshouldtimefarmbogs) {
        for (var map in game.global.mapsOwnedArray) {
            var theMap = game.global.mapsOwnedArray[map];
            if ((Rshoulddobogs || Rshouldtimefarmbogs) && theMap.name == 'The Black Bog') {
                selectedMap = theMap.id;
                break;
            } else if (runUniques && theMap.noRecycle) {
                if (theMap.name == 'Big Wall' && !game.upgrades.Bounty.allowed && !game.upgrades.Bounty.done) {
                    if (game.global.world < 8 && RcalcHDratio() > 4) continue;
                    selectedMap = theMap.id;
                    break;
                }
                if (theMap.name == 'Dimension of Rage' && document.getElementById("portalBtn").style.display == "none" && game.upgrades.Rage.done == 1) {
                    if (game.global.challenge != "Unlucky" && (game.global.world < 16 || RcalcHDratio() < 2)) continue;
                    selectedMap = theMap.id;
                    break;
                }
                if (getPageSetting('Rprispalace') == true && theMap.name == 'Prismatic Palace' && game.mapUnlocks.Prismalicious.canRunOnce) {
                    if (game.global.world < 21 || RcalcHDratio() > 25) continue;
                    selectedMap = theMap.id;
                    break;
                }
                var meltingpoint = [10000, 10000];
                if (getPageSetting('Rmeltpoint')[0] > 0 && getPageSetting('Rmeltpoint')[1] >= 0) meltingpoint = getPageSetting('Rmeltpoint');
                if (theMap.name == 'Melting Point' && ((game.global.challengeActive == "Trappapalooza" && game.global.world >= meltingpoint[0] && ((game.global.lastClearedCell + 1) >= meltingpoint[1])) || (game.global.challengeActive == "Melt" && game.global.world >= meltingpoint[0] && ((game.global.lastClearedCell + 1) >= meltingpoint[1])) || (getPageSetting('Rmeltsmithy') > 0 && getPageSetting('Rmeltsmithy') <= game.buildings.Smithy.owned && game.mapUnlocks.SmithFree.canRunOnce))) {
                    if (game.global.world < 50 || (game.global.world == 50 && game.global.lastClearedCell < 55)) continue;
                    selectedMap = theMap.id;
                    break;
                }
            }
        }
    }

    //Voids
    if (RneedToVoid) {
        var voidArray = [];
        var prefixlist = {
            'Deadly': 10,
            'Heinous': 11,
            'Poisonous': 20,
            'Destructive': 30
        };
        var prefixkeys = Object.keys(prefixlist);
        var suffixlist = {
            'Descent': 7.077,
            'Void': 8.822,
            'Nightmare': 9.436,
            'Pit': 10.6
        };
        var suffixkeys = Object.keys(suffixlist);

        if (game.global.challengeActive != "Daily" && getPageSetting('Ronlystackedvoids') == true) {
            for (var map in game.global.mapsOwnedArray) {
                var theMap = game.global.mapsOwnedArray[map];
                if (theMap.location == 'Void' && theMap.stacked > 0) {
                    for (var pre in prefixkeys) {
                        if (theMap.name.includes(prefixkeys[pre]))
                            theMap.sortByDiff = 1 * prefixlist[prefixkeys[pre]];
                    }
                    for (var suf in suffixkeys) {
                        if (theMap.name.includes(suffixkeys[suf]))
                            theMap.sortByDiff += 1 * suffixlist[suffixkeys[suf]];
                    }
                    voidArray.push(theMap);
                }
            }
        } else {
            for (var map in game.global.mapsOwnedArray) {
                var theMap = game.global.mapsOwnedArray[map];
                if (theMap.location == 'Void') {
                    for (var pre in prefixkeys) {
                        if (theMap.name.includes(prefixkeys[pre]))
                            theMap.sortByDiff = 1 * prefixlist[prefixkeys[pre]];
                    }
                    for (var suf in suffixkeys) {
                        if (theMap.name.includes(suffixkeys[suf]))
                            theMap.sortByDiff += 1 * suffixlist[suffixkeys[suf]];
                    }
                    voidArray.push(theMap);
                }
            }
        }

        var voidArraySorted = voidArray.sort(function(a, b) {
            return a.sortByDiff - b.sortByDiff;
        });
        for (var map in voidArraySorted) {
            var theMap = voidArraySorted[map];
            RdoVoids = true;
            if (getPageSetting('RDisableFarm') <= 0)
                RshouldFarm = RshouldFarm || false;
            if (!restartVoidMap)
                selectedMap = theMap.id;
            break;
        }
    }

    //Automaps

    //Raiding
    if (Rshoulddopraid) {
        if (selectedMap == "world") {
            selectedMap = "createp";
        }
    }

    //Everything else
    if (!Rshoulddopraid && (RshouldDoMaps || RdoVoids || Rshouldtimefarm || Rshoulddoquest > 0 || Rshouldmayhem > 0 || Rshouldinsanityfarm || Rshouldstormfarm || Rshouldequipfarm || Rshouldshipfarm)) {
        if (selectedMap == "world") {
            if (Rshouldmayhem > 0 && !Rshouldtimefarm && !Rshouldinsanityfarm && !Rshouldequipfarm && !Rshouldshipfarm) {
                if (getPageSetting('Rmayhemmap') == 2) {
                    for (var map in game.global.mapsOwnedArray) {
                        if (!game.global.mapsOwnedArray[map].noRecycle && mayhemextra >= 0 && ((game.global.world + mayhemextra) == game.global.mapsOwnedArray[map].level)) {
                            selectedMap = game.global.mapsOwnedArray[map].id;
			    break;
                        } else {
                            selectedMap = "create";
                        }
                    }
                } else {
                    for (var map in game.global.mapsOwnedArray) {
                        if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                            selectedMap = game.global.mapsOwnedArray[map].id;
			    break;
                        } else {
                            selectedMap = "create";
                        }
                    }
                }
	    } else if (Rshouldinsanityfarm && !Rshouldtimefarm && !Rshouldequipfarm && !Rshouldshipfarm) {
                if (getPageSetting('Rinsanityfarmlevel') == 0) {
                    for (var map in game.global.mapsOwnedArray) {
                        if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                            selectedMap = game.global.mapsOwnedArray[map].id;
			    break;
                        } else {
                            selectedMap = "create";
                        }
                    }
                } else if (getPageSetting('Rinsanityfarmlevel') != 0) {
                    var insanityfarmlevel = getPageSetting('Rinsanityfarmlevel');
                    var insanityfarmlevelindex = insanityfarmzone.indexOf(game.global.world);
                    var insanitylevelzones = insanityfarmlevel[insanityfarmlevelindex];
                    if (insanitylevelzones > 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && ((game.global.world + insanitylevelzones) == game.global.mapsOwnedArray[map].level)) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    } else if (insanitylevelzones == 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    } else if (insanitylevelzones < 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && ((game.global.world + insanitylevelzones) == game.global.mapsOwnedArray[map].level)) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    }
                }
	    } else if (Rshouldshipfarm && !Rshouldtimefarm && !Rshouldequipfarm) {
                if (getPageSetting('Rshipfarmlevel') == 0) {
                    for (var map in game.global.mapsOwnedArray) {
                        if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                            selectedMap = game.global.mapsOwnedArray[map].id;
			    break;
                        } else {
                            selectedMap = "create";
                        }
                    }
                } else if (getPageSetting('Rshipfarmlevel') != 0) {
                    var shipfarmlevel = getPageSetting('Rshipfarmlevel');
                    var shipfarmlevelindex = shipfarmzone.indexOf(game.global.world);
                    var shiplevelzones = shipfarmlevel[shipfarmlevelindex];
                    if (shiplevelzones > 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && ((game.global.world + shiplevelzones) == game.global.mapsOwnedArray[map].level)) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    } else if (shiplevelzones == 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    } else if (shiplevelzones < 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && ((game.global.world + shiplevelzones) == game.global.mapsOwnedArray[map].level)) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    }
                }
            } else if (Rshouldtimefarm && !Rshouldequipfarm) {
                if (getPageSetting('Rtimemaplevel') == 0) {
                    for (var map in game.global.mapsOwnedArray) {
                        if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                            selectedMap = game.global.mapsOwnedArray[map].id;
			    break;
                        } else {
                            selectedMap = "create";
                        }
                    }
                } else if (getPageSetting('Rtimemaplevel') != 0) {
                    var timefarmlevel = getPageSetting('Rtimemaplevel');
                    var timefarmlevelindex = timefarmzone.indexOf(game.global.world);
                    var levelzones = timefarmlevel[timefarmlevelindex];
                    if (levelzones > 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && ((game.global.world + levelzones) == game.global.mapsOwnedArray[map].level)) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    } else if (levelzones == 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    } else if (levelzones < 0) {
                        for (var map in game.global.mapsOwnedArray) {
                            if (!game.global.mapsOwnedArray[map].noRecycle && ((game.global.world - 1) == game.global.mapsOwnedArray[map].level)) {
                                selectedMap = game.global.mapsOwnedArray[map].id;
				break;
                            } else {
                                selectedMap = "create";
                            }
                        }
                    }
                }
	    } else if (Rshouldequipfarm) {
                for (var map in game.global.mapsOwnedArray) {
                    if (!game.global.mapsOwnedArray[map].noRecycle && equipminus <= 0 && ((game.global.world + equipminus) == game.global.mapsOwnedArray[map].level)) {
                        selectedMap = game.global.mapsOwnedArray[map].id;
			break;
                    } else {
                            selectedMap = "create";
                    }
                }
	    } else {
                    for (var map in game.global.mapsOwnedArray) {
                        if (!game.global.mapsOwnedArray[map].noRecycle && game.global.world == game.global.mapsOwnedArray[map].level) {
                            selectedMap = game.global.mapsOwnedArray[map].id;
			    break;
                        } else {
                            selectedMap = "create";
                        }
                    }
                }
        }
    }

    //Getting to Map Creation and Repeat
    if (!game.global.preMapsActive && game.global.mapsActive) {
        var doDefaultMapBonus = game.global.mapBonus < getPageSetting('RMaxMapBonuslimit') - 1;
        if ((Rshoulddopraid || (Rshoulddopraid && RAMPfragfarming)) || (Rshouldinsanityfarm || (Rshouldinsanityfarm && Rinsanityfragfarming)) || (selectedMap == game.global.currentMapId && (!getCurrentMapObject().noRecycle && (doDefaultMapBonus || RvanillaMapatZone || RdoMaxMapBonus || RshouldFarm || Rshouldtimefarm || Rshoulddobogs || Rshoulddoquest > 0 || Rshouldmayhem > 0 || Rshouldstormfarm || Rshouldequipfarm || (Rshouldshipfarm || (Rshouldshipfarm && Rshipfragfarming)))))) {
            if (!game.global.repeatMap) {
                repeatClicked();
            }
            if (Rshoulddopraid && !RAMPfragfarming) {
                if (game.options.menu.repeatUntil.enabled != 2) {
                    game.options.menu.repeatUntil.enabled = 2;
                }
            } else if ((Rshoulddopraid && RAMPfragfarming) || (Rshouldinsanityfarm && Rinsanityfragfarming) || (Rshouldshipfarm && Rshipfragfarming)) {
                if (game.options.menu.repeatUntil.enabled != 0) {
                    game.options.menu.repeatUntil.enabled = 0;
                }
            }
            if (!Rshoulddopraid && !RAMPfragfarming && !Rshouldinsanityfarm && !Rinsanityfragfarming && !Rshoulddobogs && !RshouldDoMaps && !Rshouldtimefarm && Rshoulddoquest <= 0 && Rshouldmayhem <= 0 && !Rshouldstormfarm && !Rshouldequipfarm && !Rshouldshipfarm && !Rshipfragfarming) {
                repeatClicked();
            }
            if (shouldDoHealthMaps && game.global.mapBonus >= getPageSetting('RMaxMapBonushealth')) {
                repeatClicked();
                shouldDoHealthMaps = false;
            }
            if (RdoMaxMapBonus && game.global.mapBonus < getPageSetting('RMaxMapBonuslimit')) {
                repeatClicked();
                RdoMaxMapBonus = false;
            }
            if (game.global.repeatMap && Rshoulddoquest == 3 && game.global.mapBonus >= 4) {
                repeatClicked();
            }
            if (game.global.repeatMap && Rshoulddopraid && RAMPfragfarming && RAMPfrag() == true) {
                repeatClicked();
            }
	    if (game.global.repeatMap && Rshouldinsanityfarm && Rinsanityfragfarming && insanityfrag() == true) {
                repeatClicked();
            }
	    if (game.global.repeatMap && Rshouldshipfarm && Rshipfragfarming && shipfrag() == true) {
                repeatClicked();
            }

        } else {
            if (game.global.repeatMap) {
                repeatClicked();
            }
            if (restartVoidMap) {
                mapsClicked(true);
            }
        }
    } else if (!game.global.preMapsActive && !game.global.mapsActive) {
        if (selectedMap != "world") {
            if (!game.global.switchToMaps) {
                mapsClicked();
            }
            if (RdoVoids && game.global.switchToMaps &&
                (RdoVoids ||
                    (!RenoughDamage && RenoughHealth && game.global.lastClearedCell < 9) ||
                    (RshouldFarm && game.global.lastClearedCell >= MODULES.maps.RshouldFarmCell)) &&
                (
                    (game.resources.trimps.realMax() <= game.resources.trimps.owned + 1) ||
                    (RdoVoids && game.global.lastClearedCell > 70)
                )
            ) {
                mapsClicked();
            }
        }

    //Creating Map
    } else if (game.global.preMapsActive) {
        if (selectedMap == "world") {
            mapsClicked();
        } else if (selectedMap == "createp") {
            RAMPdone = false;
            var RAMPfragcheck = true;
            if (getPageSetting('RAMPraidfrag') > 0) {
                if (RAMPfrag() == true) {
                    RAMPfragcheck = true;
                    RAMPfragfarming = false;
                } else if (RAMPfrag() == false && !RAMPmapbought1 && !RAMPmapbought2 && !RAMPmapbought3 && !RAMPmapbought4 && !RAMPmapbought5 && Rshoulddopraid) {
                    RAMPfragfarming = true;
                    RAMPfragcheck = false;
                    if (!RAMPfragcheck && RAMPfragmappy == undefined && !RAMPfragmappybought && game.global.preMapsActive && Rshoulddopraid) {
                        debug("Check complete for frag map");
                        RAMPfragmap();
                        if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                            buyMap();
                            RAMPfragmappybought = true;
                            if (RAMPfragmappybought) {
                                RAMPfragmappy = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                                debug("frag map bought");
                            }
                        }
                    }
                    if (!RAMPfragcheck && game.global.preMapsActive && !game.global.mapsActive && RAMPfragmappybought && RAMPfragmappy != undefined && Rshoulddopraid) {
                        debug("running frag map");
                        selectedMap = RAMPfragmappy;
                        selectMap(RAMPfragmappy);
                        runMap();
                        RlastMapWeWereIn = getCurrentMapObject();
                        RAMPprefragmappy = RAMPfragmappy;
                        RAMPfragmappy = undefined;
                    }
                    if (!RAMPfragcheck && game.global.mapsActive && RAMPfragmappybought && RAMPprefragmappy != undefined && Rshoulddopraid) {
                        if (RAMPfrag() == false) {
                            if (!game.global.repeatMap) {
                                repeatClicked();
                            }
                        } else if (RAMPfrag() == true) {
                            if (game.global.repeatMap) {
                                repeatClicked();
                                mapsClicked();
                            }
                            if (game.global.preMapsActive && RAMPfragmappybought && RAMPprefragmappy != undefined && Rshoulddopraid) {
                                RAMPfragmappybought = false;
                            }
                            if (RAMPprefragmappy != undefined) {
                                recycleMap(getMapIndex(RAMPprefragmappy));
                                RAMPprefragmappy = undefined;
                            }
                            RAMPfragcheck = true;
                            RAMPfragfarming = false;
                        }
                    }
                } else {
                    RAMPfragcheck = true;
                    RAMPfragfarming = false;
                }
            }
            if (RAMPfragcheck && RAMPpMap5 == undefined && !RAMPmapbought5 && game.global.preMapsActive && Rshoulddopraid && RAMPshouldrunmap(0)) {
                debug("Check complete for 5th map");
                RAMPplusPres(0);
                if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                    buyMap();
                    RAMPmapbought5 = true;
                    if (RAMPmapbought5) {
                        RAMPpMap5 = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                        debug("5th map bought");
                    }
                }
            }
            if (RAMPfragcheck && RAMPpMap4 == undefined && !RAMPmapbought4 && game.global.preMapsActive && Rshoulddopraid && RAMPshouldrunmap(1)) {
                debug("Check complete for 4th map");
                RAMPplusPres(1);
                if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                    buyMap();
                    RAMPmapbought4 = true;
                    if (RAMPmapbought4) {
                        RAMPpMap4 = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                        debug("4th map bought");
                    }
                }
            }
            if (RAMPfragcheck && RAMPpMap3 == undefined && !RAMPmapbought3 && game.global.preMapsActive && Rshoulddopraid && RAMPshouldrunmap(2)) {
                debug("Check complete for 3rd map");
                RAMPplusPres(2);
                if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                    buyMap();
                    RAMPmapbought3 = true;
                    if (RAMPmapbought3) {
                        RAMPpMap3 = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                        debug("3rd map bought");
                    }
                }
            }
            if (RAMPfragcheck && RAMPpMap2 == undefined && !RAMPmapbought2 && game.global.preMapsActive && Rshoulddopraid && RAMPshouldrunmap(3)) {
                debug("Check complete for 2nd map");
                RAMPplusPres(3);
                if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                    buyMap();
                    RAMPmapbought2 = true;
                    if (RAMPmapbought2) {
                        RAMPpMap2 = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                        debug("2nd map bought");
                    }
                }
            }
            if (RAMPfragcheck && RAMPpMap1 == undefined && !RAMPmapbought1 && game.global.preMapsActive && Rshoulddopraid && RAMPshouldrunmap(4)) {
                debug("Check complete for 1st map");
                RAMPplusPres(4);
                if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                    buyMap();
                    RAMPmapbought1 = true;
                    if (RAMPmapbought1) {
                        RAMPpMap1 = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                        debug("1st map bought");
                    }
                }
            }
            if (RAMPfragcheck && !RAMPmapbought1 && !RAMPmapbought2 && !RAMPmapbought3 && !RAMPmapbought4 && !RAMPmapbought5) {
                RAMPpMap1 = undefined;
                RAMPpMap2 = undefined;
                RAMPpMap3 = undefined;
                RAMPpMap4 = undefined;
                RAMPpMap5 = undefined;
                debug("Failed to Prestige Raid. Looks like you can't afford to or have no equips to get!");
                Rshoulddopraid = false;
                autoTrimpSettings["RAutoMaps"].value = 0;
            }
            if (RAMPfragcheck && game.global.preMapsActive && !game.global.mapsActive && RAMPmapbought1 && RAMPpMap1 != undefined && Rshoulddopraid) {
                debug("running map 1");
                selectedMap = RAMPpMap1;
                selectMap(RAMPpMap1);
                runMap();
                RlastMapWeWereIn = getCurrentMapObject();
                RAMPrepMap1 = RAMPpMap1;
                RAMPpMap1 = undefined;
            }
            if (RAMPfragcheck && game.global.preMapsActive && !game.global.mapsActive && RAMPmapbought2 && RAMPpMap2 != undefined && Rshoulddopraid) {
                debug("running map 2");
                selectedMap = RAMPpMap2;
                selectMap(RAMPpMap2);
                runMap();
                RlastMapWeWereIn = getCurrentMapObject();
                RAMPrepMap2 = RAMPpMap2;
                RAMPpMap2 = undefined;
            }
            if (RAMPfragcheck && game.global.preMapsActive && !game.global.mapsActive && RAMPmapbought3 && RAMPpMap3 != undefined && Rshoulddopraid) {
                debug("running map 3");
                selectedMap = RAMPpMap3;
                selectMap(RAMPpMap3);
                runMap();
                RlastMapWeWereIn = getCurrentMapObject();
                RAMPrepMap3 = RAMPpMap3;
                RAMPpMap3 = undefined;
            }
            if (RAMPfragcheck && game.global.preMapsActive && !game.global.mapsActive && RAMPmapbought4 && RAMPpMap4 != undefined && Rshoulddopraid) {
                debug("running map 4");
                selectedMap = RAMPpMap4;
                selectMap(RAMPpMap4);
                runMap();
                RlastMapWeWereIn = getCurrentMapObject();
                RAMPrepMap4 = RAMPpMap4;
                RAMPpMap4 = undefined;
            }
            if (RAMPfragcheck && game.global.preMapsActive && !game.global.mapsActive && RAMPmapbought5 && RAMPpMap5 != undefined && Rshoulddopraid) {
                debug("running map 5");
                selectedMap = RAMPpMap5;
                selectMap(RAMPpMap5);
                runMap();
                RlastMapWeWereIn = getCurrentMapObject();
                RAMPrepMap5 = RAMPpMap5;
                RAMPpMap5 = undefined;
            }
        } else if (selectedMap == "create") {
            document.getElementById("mapLevelInput").value = game.global.world;
            var decrement;
            var tier;
            if (game.global.world >= MODULES.maps.RMapTierZone[0]) {
                tier = MODULES.maps.RMapTier0Sliders;
                decrement = [];
            } else if (game.global.world >= MODULES.maps.RMapTierZone[1]) {
                tier = MODULES.maps.RMapTier1Sliders;
                decrement = ['loot'];
            } else if (game.global.world >= MODULES.maps.RMapTierZone[2]) {
                tier = MODULES.maps.RMapTier2Sliders;
                decrement = ['loot'];
            } else {
                tier = MODULES.maps.RMapTier3Sliders;
                decrement = ['diff', 'loot'];
            }
            sizeAdvMapsRange.value = tier[0];
            adjustMap('size', tier[0]);
            difficultyAdvMapsRange.value = tier[1];
            adjustMap('difficulty', tier[1]);
            lootAdvMapsRange.value = tier[2];
            adjustMap('loot', tier[2]);
            biomeAdvMapsSelect.value = autoTrimpSettings.Rmapselection.selected == "Gardens" ? "Plentiful" : autoTrimpSettings.Rmapselection.selected;
            updateMapCost();
            if (RshouldFarm || game.global.challengeActive == 'Transmute') {
                biomeAdvMapsSelect.value = game.global.decayDone ? "Plentiful" : "Forest";
                updateMapCost();
            }
            if (Rshouldinsanityfarm && !Rshouldtimefarm && !Rshoulddoquest && !Rshouldequipfarm && !Rshouldshipfarm) {
		var insanityfragcheck = true;
		if (getPageSetting('Rinsanityfarmfrag') == true) {
                    if (insanityfrag() == true) {
                        insanityfragcheck = true;
                        Rinsanityfragfarming = false;
                    } else if (insanityfrag() == false && Rshouldinsanityfarm) {
                        Rinsanityfragfarming = true;
                        insanityfragcheck = false;
                        if (!insanityfragcheck && insanityfragmappy == undefined && !insanityfragmappybought && game.global.preMapsActive && Rshouldinsanityfarm) {
                            debug("Check complete for insanity frag map");
                            insanityfragmap();
                            if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                                buyMap();
                                insanityfragmappybought = true;
                                if (insanityfragmappybought) {
                                    insanityfragmappy = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                                    debug("insanity frag map bought");
                                }
                            }
                        }
                        if (!insanityfragcheck && game.global.preMapsActive && !game.global.mapsActive && insanityfragmappybought && insanityfragmappy != undefined && Rshouldinsanityfarm) {
                            debug("running insanity frag map");
                            selectedMap = insanityfragmappy;
                            selectMap(insanityfragmappy);
                            runMap();
                            RlastMapWeWereIn = getCurrentMapObject();
                            insanityprefragmappy = insanityfragmappy;
                            insanityfragmappy = undefined;
                        }
                        if (!insanityfragcheck && game.global.mapsActive && insanityfragmappybought && insanityprefragmappy != undefined && Rshouldinsanityfarm) {
                            if (insanityfrag() == false) {
                                if (!game.global.repeatMap) {
                                    repeatClicked();
                                }
                            } else if (insanityfrag() == true) {
                                if (game.global.repeatMap) {
                                    repeatClicked();
                                    mapsClicked();
                                }
                                if (game.global.preMapsActive && insanityfragmappybought && insanityprefragmappy != undefined && Rshouldinsanityfarm) {
                                    insanityfragmappybought = false;
                                }
                                if (insanityprefragmappy != undefined) {
                                    recycleMap(getMapIndex(insanityprefragmappy));
                                    insanityprefragmappy = undefined;
                                }
                                insanityfragcheck = true;
                                Rinsanityfragfarming = false;
                            }
                        }
                    } else {
                        insanityfragcheck = true;
                        Rinsanityfragfarming = false;
                    }
                }
                if (insanityfragcheck && getPageSetting('Rinsanityfarmlevel') != 0) {

                    var insanityfarmlevel = getPageSetting('Rinsanityfarmlevel');

                    var insanityfarmlevelindex = insanityfarmzone.indexOf(game.global.world);
                    var insanitylevelzones = insanityfarmlevel[insanityfarmlevelindex];

                    if (insanityfarmzone.includes(game.global.world)) {
                        if (insanitylevelzones > 0) {
                            document.getElementById("mapLevelInput").value = game.global.world;
                            document.getElementById("advExtraLevelSelect").value = insanitylevelzones;
                        } else if (insanitylevelzones < 0) {
                            document.getElementById("mapLevelInput").value = (game.global.world + insanitylevelzones);
			    document.getElementById("advExtraLevelSelect").value = 0;
                        }
                    }
                }
                updateMapCost();
            }
	    if (Rshouldshipfarm && !Rshouldtimefarm && !Rshoulddoquest && !Rshouldequipfarm) {
		var shipfragcheck = true;
		if (getPageSetting('Rshipfarmfrag') == true) {
                    if (shipfrag() == true) {
                        shipfragcheck = true;
                        Rshipfragfarming = false;
                    } else if (shipfrag() == false && Rshouldshipfarm) {
                        Rshipfragfarming = true;
                        shipfragcheck = false;
                        if (!shipfragcheck && shipfragmappy == undefined && !shipfragmappybought && game.global.preMapsActive && Rshouldshipfarm) {
                            debug("Check complete for ship frag map");
                            shipfragmap();
                            if ((updateMapCost(true) <= game.resources.fragments.owned)) {
                                buyMap();
                                shipfragmappybought = true;
                                if (shipfragmappybought) {
                                    shipfragmappy = game.global.mapsOwnedArray[game.global.mapsOwnedArray.length - 1].id;
                                    debug("ship frag map bought");
                                }
                            }
                        }
                        if (!shipfragcheck && game.global.preMapsActive && !game.global.mapsActive && shipfragmappybought && shipfragmappy != undefined && Rshouldshipfarm) {
                            debug("running ship frag map");
                            selectedMap = shipfragmappy;
                            selectMap(shipfragmappy);
                            runMap();
                            RlastMapWeWereIn = getCurrentMapObject();
                            shipprefragmappy = shipfragmappy;
                            shipfragmappy = undefined;
                        }
                        if (!shipfragcheck && game.global.mapsActive && shipfragmappybought && shipprefragmappy != undefined && Rshouldshipfarm) {
                            if (shipfrag() == false) {
                                if (!game.global.repeatMap) {
                                    repeatClicked();
                                }
                            } else if (shipfrag() == true) {
                                if (game.global.repeatMap) {
                                    repeatClicked();
                                    mapsClicked();
                                }
                                if (game.global.preMapsActive && shipfragmappybought && shipprefragmappy != undefined && Rshouldshipfarm) {
                                    shipfragmappybought = false;
                                }
                                if (shipprefragmappy != undefined) {
                                    recycleMap(getMapIndex(shipprefragmappy));
                                    shipprefragmappy = undefined;
                                }
                                shipfragcheck = true;
                                Rshipfragfarming = false;
                            }
                        }
                    } else {
                        shipfragcheck = true;
                        Rshipfragfarming = false;
                    }
                }
                if (shipfragcheck && getPageSetting('Rshipfarmlevel') != 0) {

                    var shipfarmlevel = getPageSetting('Rshipfarmlevel');

                    var shipfarmlevelindex = shipfarmzone.indexOf(game.global.world);
                    var shiplevelzones = shipfarmlevel[shipfarmlevelindex];

                    if (shipfarmzone.includes(game.global.world)) {
                        if (shiplevelzones > 0) {
                            document.getElementById("mapLevelInput").value = game.global.world;
                            document.getElementById("advExtraLevelSelect").value = shiplevelzones;
                        } else if (shiplevelzones == 0) {
                            document.getElementById("mapLevelInput").value = game.global.world;
			    document.getElementById("advExtraLevelSelect").value = 0;
			} else if (shiplevelzones < 0) {
                            document.getElementById("mapLevelInput").value = (game.global.world + shiplevelzones);
			    document.getElementById("advExtraLevelSelect").value = 0;
                        }
                    }
                }
                updateMapCost();
            }
            if (Rshouldtimefarm && !Rshoulddoquest) {
                if (getPageSetting('Rtimemaplevel') != 0) {

                    var timefarmlevel = getPageSetting('Rtimemaplevel');

                    var timefarmlevelindex = timefarmzone.indexOf(game.global.world);
                    var levelzones = timefarmlevel[timefarmlevelindex];

                    if (timefarmzone.includes(game.global.world)) {
                        if (levelzones > 0) {
                            document.getElementById("mapLevelInput").value = game.global.world;
                            document.getElementById("advExtraLevelSelect").value = levelzones;
                        } else if (levelzones < 0) {
                            document.getElementById("mapLevelInput").value = (game.global.world - 1);
                        }
                    }
                }
                biomeAdvMapsSelect.value = autoTrimpSettings.Rtimemapselection.selected;
                document.getElementById("advSpecialSelect").value = autoTrimpSettings.Rtimespecialselection.selected;
                updateMapCost();
            }
            if (Rshoulddoquest) {
                biomeAdvMapsSelect.value = "Plentiful";
                if (Rshoulddoquest == 4) {
                    document.getElementById("advSpecialSelect").value = "hc";
                    updateMapCost();
                    if (updateMapCost(true) > game.resources.fragments.owned) {
                        document.getElementById("advSpecialSelect").value = "fa";
                        updateMapCost();
                        if (updateMapCost(true) > game.resources.fragments.owned) {
                            document.getElementById("advSpecialSelect").value = 0;
                            updateMapCost();
                        }
                    }
                }
                if (Rshoulddoquest == 7) {
                    document.getElementById("advSpecialSelect").value = "hc";
                    updateMapCost();
                    if (updateMapCost(true) > game.resources.fragments.owned) {
                        document.getElementById("advSpecialSelect").value = "lc";
                        updateMapCost();
                        if (updateMapCost(true) > game.resources.fragments.owned) {
                            document.getElementById("advSpecialSelect").value = "fa";
                            updateMapCost();
                            if (updateMapCost(true) > game.resources.fragments.owned) {
                                document.getElementById("advSpecialSelect").value = 0;
                                updateMapCost();
                            }
                        }
                    }
                }
                if (Rshoulddoquest == 10) {
                    document.getElementById("advSpecialSelect").value = "lsc";
                    updateMapCost();
                    if (updateMapCost(true) > game.resources.fragments.owned) {
                        document.getElementById("advSpecialSelect").value = "ssc";
                        updateMapCost();
                        if (updateMapCost(true) > game.resources.fragments.owned) {
                            document.getElementById("advSpecialSelect").value = "fa";
                            updateMapCost();
                            if (updateMapCost(true) > game.resources.fragments.owned) {
                                document.getElementById("advSpecialSelect").value = 0;
                                updateMapCost();
                            }
                        }
                    }
                }
                if (Rshoulddoquest == 11) {
                    document.getElementById("advSpecialSelect").value = "lwc";
                    updateMapCost();
                    if (updateMapCost(true) > game.resources.fragments.owned) {
                        document.getElementById("advSpecialSelect").value = "swc";
                        updateMapCost();
                        if (updateMapCost(true) > game.resources.fragments.owned) {
                            document.getElementById("advSpecialSelect").value = "fa";
                            updateMapCost();
                            if (updateMapCost(true) > game.resources.fragments.owned) {
                                document.getElementById("advSpecialSelect").value = 0;
                                updateMapCost();
                            }
                        }
                    }
                }
                if (Rshoulddoquest == 12) {
                    document.getElementById("advSpecialSelect").value = "lmc";
                    updateMapCost();
                    if (updateMapCost(true) > game.resources.fragments.owned) {
                        document.getElementById("advSpecialSelect").value = "smc";
                        updateMapCost();
                        if (updateMapCost(true) > game.resources.fragments.owned) {
                            document.getElementById("advSpecialSelect").value = "fa";
                            updateMapCost();
                            if (updateMapCost(true) > game.resources.fragments.owned) {
                                document.getElementById("advSpecialSelect").value = 0;
                                updateMapCost();
                            }
                        }
                    }
                }
                if (Rshoulddoquest == 13) {
                    document.getElementById("advSpecialSelect").value = "fa";
                    updateMapCost();
                    if (updateMapCost(true) > game.resources.fragments.owned) {
                        document.getElementById("advSpecialSelect").value = 0;
                        updateMapCost();
                    }
                }
                if (Rshoulddoquest == 14) {
                    document.getElementById("advSpecialSelect").value = "fa";
                    updateMapCost();
                    if (updateMapCost(true) > game.resources.fragments.owned) {
                        document.getElementById("advSpecialSelect").value = 0;
                        updateMapCost();
                    }
                }
                if (updateMapCost(true) > game.resources.fragments.owned) {
                    biomeAdvMapsSelect.value = "Random";
                    updateMapCost();
                }
            }
            if (Rshouldmayhem > 0 && getPageSetting('Rmayhemmap') == 2 && !Rshouldtimefarm) {
                mapLevelInput.value = game.global.world;
                biomeAdvMapsSelect.value = "Random";
                document.getElementById("advSpecialSelect").value = "fa";
                document.getElementById("advExtraLevelSelect").value = mayhemextra;
                updateMapCost();
		if (updateMapCost(true) > game.resources.fragments.owned) {
		console.log("cant afford this shit dumbass btw mayhemextra is " + mayhemextra);
		}
            }
	    if (Rshouldequipfarm) {
                mapLevelInput.value = game.global.world + equipminus;
                biomeAdvMapsSelect.value = "Plentiful";
                document.getElementById("advSpecialSelect").value = "lmc";
                document.getElementById("advExtraLevelSelect").value = 0;
                updateMapCost();
            }
            if (updateMapCost(true) > game.resources.fragments.owned) {
                if (!RenoughDamage) decrement.push('diff');
                if (RshouldFarm) decrement.push('size');
            }
            while (decrement.indexOf('loot') > -1 && lootAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                lootAdvMapsRange.value -= 1;
            }
            while (decrement.indexOf('diff') > -1 && difficultyAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                difficultyAdvMapsRange.value -= 1;
            }
            while (decrement.indexOf('size') > -1 && sizeAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                sizeAdvMapsRange.value -= 1;
            }
            while (lootAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                lootAdvMapsRange.value -= 1;
            }
            while (difficultyAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                difficultyAdvMapsRange.value -= 1;
            }
            while (sizeAdvMapsRange.value > 0 && updateMapCost(true) > game.resources.fragments.owned) {
                sizeAdvMapsRange.value -= 1;
            }
            var maplvlpicked = parseInt(document.getElementById("mapLevelInput").value);
            if (updateMapCost(true) > game.resources.fragments.owned) {
                selectMap(game.global.mapsOwnedArray[highestMap].id);
                debug("Can't afford the map we designed, #" + maplvlpicked, "maps", '*crying2');
                debug("...selected our highest map instead # " + game.global.mapsOwnedArray[highestMap].id + " Level: " + game.global.mapsOwnedArray[highestMap].level, "maps", '*happy2');
                runMap();
                RlastMapWeWereIn = getCurrentMapObject();
            } else {
                debug("Buying a Map, level: #" + maplvlpicked, "maps", 'th-large');
                var result = buyMap();
                if (result == -2) {
                    debug("Too many maps, recycling now: ", "maps", 'th-large');
                    recycleBelow(true);
                    debug("Retrying, Buying a Map, level: #" + maplvlpicked, "maps", 'th-large');
                    result = buyMap();
                    if (result == -2) {
                        recycleMap(lowestMap);
                        result = buyMap();
                        if (result == -2)
                            debug("AutoMaps unable to recycle to buy map!");
                        else
                            debug("Retrying map buy after recycling lowest level map");
                    }
                }
            }
        } else {
            selectMap(selectedMap);
            var themapobj = game.global.mapsOwnedArray[getMapIndex(selectedMap)];
            var levelText;
            if (themapobj.level > 0) {
                levelText = " Level: " + themapobj.level;
            } else {
                levelText = " Level: " + game.global.world;
            }
            var voidorLevelText = themapobj.location == "Void" ? " Void: " : levelText;
            debug("Running selected " + selectedMap + voidorLevelText + " Name: " + themapobj.name, "maps", 'th-large');
            runMap();
            RlastMapWeWereIn = getCurrentMapObject();
        }
    }
}
