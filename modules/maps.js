//Helium
MODULES.maps = {};
MODULES.maps.SkipNumUnboughtPrestiges = 2;
MODULES.maps.UnearnedPrestigesRequired = 2;

let enoughDamage = true;
let enoughHealth = true;
let needPrestige = false;
let skippedPrestige = false;
let shouldFarm = false;
let shouldFarmDamage = false;
let lastMapWeWereIn = null;
let preSpireFarming = false;
let fragmentsNeeded = 0;

const nomFarmingCutoff = 10;
const nomFarmStacksCutoff = [7,30,100];

const mapTierZone = [72,47,16];
const mapTier0Sliders = [9,9,9,"Mountain"];
const mapTier1Sliders = [9,9,9,"Depths"];
const mapTier2Sliders = [9,9,9,"Random"];
const shouldFarmCell = 80;

// mods are from best to worst
const farmingMapMods = ["lmc", "hc", "smc", "lc", "fa"];
const prestigeMapMods = ["p", "fa"];

 // Your geneticists are frequently lagging 1-2 zones behind when speeding through magma, which is why this is important
const magmaHitsSurvived = 2;

const prestigeList = MODULES.equipment.prestiges;
const prestigeMetallics = MODULES.equipment.metallicPrestiges;
const prestigeWeapons = MODULES.equipment.weaponPrestiges;
const skipPrestigeMsg = '<br><b style="font-size:.8em;color:pink;margin-top:0.2vw">Prestige Skipped</b>';

const voidPrefixes = {
    'Deadly': 10,
    'Heinous': 11,
    'Poisonous': 20,
    'Destructive': 30
};
var voidSuffixes = {
    'Descent': 7.077,
    'Void': 8.822,
    'Nightmare': 9.436,
    'Pit': 10.6
};

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

const autoMapTarget = Object.freeze({
    // Main modes of the Automapper.
    // Their order doesn't matter in code, but for readability it generally reflects the priority -
    // meaning that if the Automapper chooses a target, remaining targets are irrelevant;
    // For example, if it chose "forceMapBonus", we need to run maps until we get the max bonus
    forceMapBonus: Symbol("forceMapBonus"),
    farming: Symbol("farming"),
    nomFarming: Symbol("nomFarming"),
    prestige: Symbol("prestige"),
    voids: Symbol("voids"),
    advancing: Symbol("advancing"),
});


class AutoMapState {
    // A global cache of all Automapper-related calculations.
    // You don't need to instantiate it, use its fields and methods directly like this: "AutoMapState.clear()".
    // This object can be accessed from other modules,
    // so make sure to not skip calculations for any externally-used fields.
    constructor() {
        throw("Don't instantiate this class, use its static methods and fields")
    }

    // public fields
    static needDamage = false;
    static needHealth = false;
    static prepareForVoids = false; // we're at Void Map zone, and have Void Maps to run
    static needPrestige = false;
    static skippedPrestige = false;
    static lastMapWeWereIn = null;
    static target = null;
    static message = 'Advancing';

    // private fields
    static #canRunVoids = false; // we're at Void Map zone, have Void Maps to run, and at >= Void Map cell
    static #mustGetMaxMapBonus = false;

    static update(HDStatus) {
        this.#clear();

        const challenge = game.global.challengeActive;
        // if we can't run maps for any reason, all other calculations are meaningless and should be skipped
        if (!this.#canAccessMaps(challenge)) {
            return;
        }

        const prestige = getPageSetting('Prestige', 'Off');
        this.#setPrestigeStatus(challenge, prestige)

        const isC2 = game.global.runningChallengeSquared;
        const isDaily = challenge === "Daily";
        this.#setVoidMapStatus(isC2, isDaily);

        // Health and Damage calculations use void map status, so they should be placed after #setVoidMapsStatus()
        const hdRatio = HDStatus.hdRatio;
        const minHitsSurvived = getMapHealthCutOff();
        const hitsSurvived = calcHealthRatio(false, true);
        this.needHealth = hitsSurvived <= minHitsSurvived && !armorCapped();
        this.needDamage = hdRatio >= getMapCutOff() && !weaponCapped();
        this.#setHealthAndDamageStatus(hdRatio, hitsSurvived, minHitsSurvived);

        const isAtSpire = isActiveSpireAT() || disActiveSpireAT();
        const maxMapBonusLimit = getPageSetting('MaxMapBonuslimit');
        this.#checkMaxMapBonus(isAtSpire, maxMapBonusLimit);

        const mapCutoff = getMapCutOff();
        const farmCutoff = getFarmCutOff();
        this.#checkFarming(isAtSpire, maxMapBonusLimit, hdRatio, mapCutoff, farmCutoff, hitsSurvived, minHitsSurvived);

        const currentMap = getCurrentMapObject();
        this.#checkNomFarming(challenge, hdRatio, currentMap);

        let shouldFarmLowerZone = getPageSetting('LowerFarmingZone');
        const isInWorld = !game.global.mapsActive && !game.global.preMapsActive;
        const isInMapChamber = !game.global.mapsActive && game.global.preMapsActive;
        const isInsideMap = game.global.mapsActive && !game.global.preMapsActive;
        const farmCutoff = getFarmCutOff();


        let ourBaseDamage = calcOurDmg("avg", "X");

    }

    static #clear() {
        this.needDamage = false;
        this.needHealth = false;
        this.prepareForVoids = false;
        this.needPrestige = false;
        this.skippedPrestige = false;
        this.lastMapWeWereIn = null;
        this.target = null;
        this.message = 'Advancing';

        this.#canRunVoids = false;
    }

    static #setTarget(target, message) {
        if (!this.target) {
            this.target = target;
            this.message = message;
        }
    }

    static #canAccessMaps(challenge) {
        // returns false if we can't access maps for any reason

        if (!game.global.mapsUnlocked) {
            return false;
        }

        if (challenge === "Mapology" && game.challenges.Mapology.credits < 1) {
            this.message = 'Out of Map Credits';
            return false;
        }

        if (isVanillaMAZActive()) {
            this.message = "Running&nbsp;Vanilla MAZ";
            return false;
        }

        return true;
    }

    static #setVoidMapStatus(isC2, isDaily) {
        // don't have any voids
        if (game.global.totalVoidMaps === 0) {
            return;
        }
        // running C2 and "no VMs in C2"
        if (isC2 && getPageSetting('novmsc2')) {
            return;
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
        const minVoidZone = max(0, getPageSetting(voidMinField, 0));
        if (minVoidZone === 0) {
            return;
        }
        let maxVoidZone = 0;
        if (!getPageSetting(voidPoisonField) || getEmpowerment() === 'Poison') {
            maxVoidZone = minVoidZone + max(0, getPageSetting(voidMaxField, 0));
        }
        // Check zone range
        if (game.global.world < minVoidZone || game.global.world > maxVoidZone) {
            return;
        }
        // What cell to run Voids at
        const voidCell = getPageSetting(voidCellField, 90);

        this.prepareForVoids = (game.global.lastClearedCell + 1) >= Math.floor((voidCell - 1) / 10) * 10;
        this.#canRunVoids = this.prepareForVoids && game.global.lastClearedCell + 1 >= voidCell;
    }

    static #setPrestigeStatus(challenge, prestige) {
        if (challenge === "Frugal") {
            return;
        }
        const prestigeZ = (prestige !== "Off" && game.mapUnlocks[prestige]) ? game.mapUnlocks[prestige].last : 9e10;
        const forcePrestigeZ = getPageSetting('ForcePresZ', 0);
        if (forcePrestigeZ > 0 && (game.global.world >= forcePrestigeZ)) {
            this.needPrestige = prestigeList.some(p => game.mapUnlocks[p].last <= (game.global.world - 5));
            // needPrestige = (offlineProgress.countMapItems(game.global.world) !== 0); TODO - Test this!
        } else {
            this.needPrestige = prestigeZ <= (game.global.world - 5);
        }

        if (!this.needPrestige) {
            return;
        }

        // Prestige skip
        const pSkip = getPageSetting('PrestigeSkip1_2');
        let skip1 = false;
        let skip2 = false;

        if (pSkip === 2) {
            // need only skip1
            skip2 = true;
        } else if (pSkip === 3) {
            // need only skip2
            skip1 = true;
        }

        // Prestige Skip 1: if we have some unbought prestiges, don't get new ones
        if ([1, 2].includes(pSkip)) {
            let skipUnbought = 0;
            for (const p of prestigeMetallics) {
                if (game.upgrades[p].allowed - game.upgrades[p].done > 0) {
                    skipUnbought++;
                    skip1 = skipUnbought >= MODULES.maps.SkipNumUnboughtPrestiges;
                    if (skip1) {
                        break;
                    }
                }
            }
        }

        // Prestige Skip 2: if there are few weapon prestiges left in maps, don't get them
        if ([1, 3].includes(pSkip)) {
            const numLeft = prestigeWeapons.filter(p => game.mapUnlocks[p].last <= (game.global.world - 5));
            skip2 = numLeft.length <= MODULES.maps.UnearnedPrestigesRequired;
        }

        if (skip1 && skip2) {
            this.needPrestige = false;
            this.skippedPrestige = true;
        }
    }

    static #setHealthAndDamageStatus(hdRatio, hitsSurvived, minHitsSurvived) {
        this.needHealth = hitsSurvived <= minHitsSurvived && !armorCapped();
        this.needDamage = hdRatio >= getMapCutOff() && !weaponCapped();
    }

    static #checkFarming(isAtSpire, maxMapBonusLimit, hdRatio, mapCutoff, farmCutoff, hitsSurvived, minHitsSurvived) {
        if (!this.needDamage && !this.needHealth) {
            return;
        }

        if (isAtSpire && getPageSetting('SkipSpires') === 1) {
            this.message = 'Skipping Spire'
            return;
        }

        const mapBonus = game.global.mapBonus;
        const maxMapBonusHealth = getPageSetting('MaxMapBonushealth');
        const farmingHD = getPageSetting('DisableFarm');
        const mapBonusIsAvailable = mapBonus < maxMapBonusLimit || (this.needHealth && mapBonus < maxMapBonusHealth);

        if (farmingHD > 0 || mapBonusIsAvailable) {
            const wantedHealth = minHitsSurvived / hitsSurvived;
            const wantedDamage = hdRatio / mapCutoff;
            const wantedFarmDmg = hdRatio / farmCutoff;

            const targets = [];
            if (wantedDamage > 1) {
                targets.push(wantedDamage.toFixed(2) + 'x&nbsp;more Dmg');
            } else if (shouldFarm && wantedFarmDmg > 1) {
                targets.push(wantedFarmDmg.toFixed(2) + 'x&nbsp;more Dmg')
            }

            if (wantedHealth > 1) {
                targets.push(wantedHealth.toFixed(2) + 'x&nbsp;more Health')
            }

            if (targets.length > 0) {
                const state = shouldFarm ? "Farm" : "Want";
                return augmentStatus(state + ' ' + targets.join(', '));
            }
            this.#setTarget(autoMapTarget.farming);
        }
    }

    static #checkNomFarming(challenge, hdRatio, currentMap) {
        if (challenge !== 'Nom' || !getPageSetting('FarmWhenNomStacks7')) {
            return;
        }
        if (game.global.mapsActive && game.global.mapGridArray[game.global.lastClearedMapCell + 1].nomStacks >= nomFarmStacksCutoff[2]) {
            // map enemy has >=100 Nom stacks, uh oh. if it's a void map, restart it. otherwise, get stuck probably D:
            this.#setTarget(autoMapTarget.nomFarming);
            if (currentMap.location === "Void") {
                // restart void
                mapsClicked(true);
            }
        }
        if (hdRatio < nomFarmingCutoff && game.global.mapBonus >= 10) {
            // can't run more maps
            return;
        }
        if (game.global.gridArray[99].nomStacks > nomFarmStacksCutoff[0]) {
            // improbability has >7 Nom stacks
            this.#setTarget(autoMapTarget.nomFarming);
        }
        if (game.global.gridArray[99].nomStacks >= nomFarmStacksCutoff[1]) {
            // improbability has >=30 Nom stacks
            this.#setTarget(autoMapTarget.nomFarming);
        } else if (!game.global.mapsActive && game.global.gridArray[game.global.lastClearedCell + 1].nomStacks >= nomFarmStacksCutoff[2]) {
            // world enemy has >=100 Nom stacks
            this.#setTarget(autoMapTarget.nomFarming);
        }
    }

    static #checkMaxMapBonus(isAtSpire, maxMapBonusLimit) {
        if (isAtSpire && getPageSetting('MaxStacksForSpire') && game.global.mapBonus < maxMapBonusLimit) {
            this.#setTarget(autoMapTarget.forceMapBonus, 'Getting max Map Bonus for Spire');
        }
        const maxMapBonusZ = getPageSetting('MaxMapBonusAfterZone', -1);
        const forceMaxMapBonus = (maxMapBonusZ >= 0 && game.global.world >= maxMapBonusZ && game.global.mapBonus < maxMapBonusLimit );
        if (forceMaxMapBonus) {
            this.#setTarget(autoMapTarget.forceMapBonus, 'Force max Map Bonus after z' + getPageSetting('MaxMapBonusAfterZone'));
        }
    }
}

function augmentStatus(status) {
    if (skippedPrestige) {
        return status + skipPrestigeMsg;
    }
    return status
}

function getAutoMapsStatus(HDStatus) {
    if (isVanillaMAZActive()) {
        return "Running&nbspVanilla MAZ";
    }
    if (game.global.challengeActive === "Mapology" && game.challenges.Mapology.credits < 1) {
        return 'Out of Map Credits';
    }
    const isInMap = game.global.mapsActive;
    const currentMap = getCurrentMapObject();
    const autoMapsDisabled = getPageSetting('AutoMaps') === 0;
    if (autoMapsDisabled) {
        if (isInMap && currentMap.level > game.global.world) {
            if (currentMap.location === "Bionic") {
                return 'BW Raiding';
            } else if (currentMap.location !== "Void") {
                return 'Prestige Raiding';
            }
        }
        return 'Off';
    }

    // Spire
    const isAtSpire = isActiveSpireAT() || disActiveSpireAT();
    if (isAtSpire) {
        if (getPageSetting('SkipSpires') === 1) {
            return augmentStatus('Skipping Spire');
        }
        if (preSpireFarming) {
            const spireTime = new Date().getTime() - game.global.zoneStarted;
            const spireFarmingMinutes = getPageSetting('MinutestoFarmBeforeSpire');
            const secs = Math.floor(60 - (spireTime * 60) % 60).toFixed(0);
            const mins = Math.floor(spireFarmingMinutes - spireTime).toFixed(0);
            const hours = ((spireFarmingMinutes - spireTime) / 60).toFixed(2);
            const spiretimeStr = (spireFarmingMinutes - spireTime >= 60) ?
                (hours + 'h') : (mins + 'm:' + (secs >= 10 ? secs : ('0' + secs)) + 's');
            return augmentStatus('Farming for Spire ' + spiretimeStr + ' left');
        }
        const spireMapBonusFarming = getPageSetting('MaxStacksForSpire') && game.global.mapBonus < 10;
        if (spireMapBonusFarming) {
            return augmentStatus('Getting Spire Map Bonus');
        }
    }

    const maxMapBonusZ = getPageSetting('MaxMapBonusAfterZone');
    const forceMaxMapBonus = (maxMapBonusZ >= 0 && game.global.mapBonus < maxMapBonusLimit && game.global.world >= maxMapBonusZ);
    if (forceMaxMapBonus) {
        return augmentStatus('Force max Map Bonus after z' + getPageSetting('MaxMapBonusAfterZone'));
    }
    if (needPrestige && !doVoids) {
        return augmentStatus('Prestige');
    }
    if (doVoids) {
        const stackedMaps = Fluffy.isRewardActive('void') ? countStackedVoidMaps() : 0;
        const stackedMapsMsg = ((stackedMaps) ? " (" + stackedMaps + " stacked)" : "");
        return augmentStatus('Void Maps: ' + game.global.totalVoidMaps + stackedMapsMsg + ' remaining');
    }

    const hdRatio = HDStatus.hdRatio;
    const wantedHealth = getMapHealthCutOff() / calcHealthRatio(false, true);
    const wantedDamage = hdRatio / getMapCutOff();
    const wantedFarmDmg = hdRatio / getFarmCutOff();

    const targets = [];
    if (wantedDamage > 1) {
        targets.push(wantedDamage.toFixed(2) + 'x&nbsp;more Dmg');
    } else if (shouldFarm && wantedFarmDmg > 1) {
        targets.push(wantedFarmDmg.toFixed(2) + 'x&nbsp;more Dmg')
    }

    if (wantedHealth > 1) {
        targets.push(wantedHealth.toFixed(2) + 'x&nbsp;more Health')
    }

    if (targets.length > 0) {
        const state = shouldFarm ? "Farm" : "Want";
        return augmentStatus(state + ' ' + targets.join(', '));
    }

    return augmentStatus('Advancing');
}

function updateAutoMapsStatus() {
    // he/hr% status
    const getPercent = (game.stats.heliumHour.value() / (game.global.totalHeliumEarned - (game.global.heliumLeftover + game.resources.helium.owned))) * 100;
    const lifetime = (game.resources.helium.owned / (game.global.totalHeliumEarned - game.resources.helium.owned)) * 100;
    const hiderStatus = 'He/hr: ' + getPercent.toFixed(3) + '%<br>&nbsp;&nbsp;&nbsp;He: ' + lifetime.toFixed(3) + '%';
    document.getElementById('autoMapStatus').innerHTML = getAutoMapsStatus();
    document.getElementById('hiderStatus').innerHTML = hiderStatus;
}

function _updateMapCost() {
    const mapCost = updateMapCost(true);
    fragmentsNeeded = Math.max(fragmentsNeeded, mapCost);
    return fragmentsNeeded;
}

function checkMapMods(noLog) {
    let mapCost = _updateMapCost();
    if (mapCost > game.resources.fragments.owned) {
        // not enough fragments even for a base map
        return false;
    }
    if (game.global.highestLevelCleared < 59) {
        // map mods aren't unlocked yet
        return true;
    }
    const availableMods = [];
    for (const mod of Object.values(mapSpecialModifierConfig)) {
        if (game.global.highestLevelCleared > mod.unlocksAt) {
            availableMods.push(mod.abv.toLowerCase());
        }
    }
    if (availableMods.length <= 0) {
        // no map mods are unlocked
        return true;
    }
    const modSelector = document.getElementById("advSpecialSelect");
    if (!modSelector) {
        // cannot access mod selector element
        return true;
    }
    let modPool = [];
    if (shouldFarm || shouldFarmDamage || !enoughHealth || preSpireFarming || (AutoMapState.prepareForVoids && !enoughDamage)) {
        modPool = farmingMapMods;
    } else if (needPrestige && enoughDamage) {
        modPool = prestigeMapMods;
    }

    for (const mod of modPool.filter(mod => availableMods.includes(mod))) {
        modSelector.value = mod;
        mapCost = _updateMapCost();
        if (mapCost <= game.resources.fragments.owned) {
            // we have a winner!
            break;
        } else if (!noLog) {
            console.log("Could not afford mod " + mapSpecialModifierConfig[mod].name);
        }
    }
    if (mapCost > game.resources.fragments.owned) {
        // couldn't afford anything, reset mods
        modSelector.value = "0";
        _updateMapCost();
        return false;
    }

    // Extra Map levels
    const extraLevelsSelect = document.getElementById("advExtraMapLevelselect");
    if (game.global.highestLevelCleared >= 209 && extraLevelsSelect) {
        extraLevelsSelect.selectedIndex = 3;
        mapCost = _updateMapCost();
        while (extraLevelsSelect.selectedIndex > 0 && mapCost > game.resources.fragments.owned) {
            extraLevelsSelect.selectedIndex -= 1;
            mapCost = _updateMapCost();
        }
    }

    let messageParts = [];
    if (modSelector.value !== "0") {
        messageParts.push(mapSpecialModifierConfig[modSelector.value].name);
    }
    if (extraLevelsSelect && extraLevelsSelect.selectedIndex > 0) {
        messageParts.push('z+' + extraLevelsSelect.selectedIndex);
    }
    if (messageParts.length > 0) {
        const ratio = (100 * (mapCost / game.resources.fragments.owned)).toFixed(2);
        debug("Set the map special modifier to: " + messageParts.join(', ') + ". Cost: " + ratio + "% of your fragments.");
    }

    return mapCost > game.resources.fragments.owned;
}

function getMapHealthCutOff(pure) {
    // Base and Spire cutOffs
    let cutoff = getPageSetting('NumHitsSurvived');
    if (pure) {
        return cutoff;
    }

    // Spire
    if (game.global.spireActive) {
        return getPageSetting('SpireHitsSurvived');
    }

    // Magma
    if (mutations.Magma.active()) {
        cutoff *= magmaHitsSurvived;
    }

    // Void Map cut off - will ALSO scale with scryer, if scrying on void maps
    if (AutoMapState.prepareForVoids) {
        if (getPageSetting("scryvoidmaps")) {
            cutoff *= getPageSetting('ScryerHitsMult');
        }
        return cutoff * getPageSetting('VoidHitsMult');
    }

    // Scryer Multiplier (only if scrying on corrupted)
    if (scryingCorruption() && game.global.challengeActive !== "Domination") {
        return cutoff * getPageSetting('ScryerHitsMult');
    }

    return cutoff;
}

function getMapCutOff(pure) {
    let cutoff = getPageSetting("mapcuntoff");
    const mapology = game.global.challengeActive === "Mapology";
    const daily = game.global.challengeActive === "Daily";
    const c2 = game.global.runningChallengeSquared;

    if (pure) {
        return cutoff;
    }

    // Spire
    if (game.global.spireActive) {
        return getPageSetting('SpireHD');
    }

    // Mapology
    if (getPageSetting("mapc2hd") > 0 && mapology) {
        cutoff = getPageSetting("mapc2hd");
    }

    // Windstacking
    const wind = getEmpowerment() === 'Wind';
    let autoStance, windMin, windCut
    if (daily) {
        autoStance = getPageSetting("AutoStance") === 3 || getPageSetting("use3daily");
        windMin = getPageSetting("dWindStackingMin") > 0 && game.global.world >= getPageSetting("dWindStackingMin");
        windCut = getPageSetting("dwindcutoffmap") > 0;
    }
    else {
        autoStance = getPageSetting("AutoStance") === 3;
        windMin = getPageSetting("WindStackingMin") > 0 && game.global.world >= getPageSetting("WindStackingMin")
        windCut = getPageSetting("windcutoffmap") > 0
    }

    // Windstack
    if (wind && !c2 && autoStance && windMin && windCut) {
        cutoff = getPageSetting("windcutoffmap");
    }

    // Void and Scry cut off
    if (AutoMapState.prepareForVoids) {
        return cutoff * getPageSetting('VoidHDMult');
    }
    if (scryingCorruption() && game.global.challengeActive !== "Domination") {
        return cutoff / getPageSetting('ScryerHDDiv');
    }

    return cutoff;
}

function getFarmCutOff() {
    let cutoff = getPageSetting("DisableFarm");

    // Spire
    if (game.global.spireActive) {
        return getPageSetting('SpireHD');
    }

    //Void and Scry
    if (AutoMapState.prepareForVoids) {
        return cutoff * getPageSetting('VoidHDMult');
    }
    if (scryingCorruption() && game.global.challengeActive !== "Domination") {
        return cutoff / getPageSetting('ScryerHDDiv');
    }

    return cutoff;
}

function getMapRatio(map, customLevel, customDiff, isPreVoidCell) {
    const level = customLevel ? customLevel : map.level;
    const diff = customDiff ? customDiff : map.difficulty;

    const mapDmg = (calcHDRatio(level, "map", isPreVoidCell) / diff) / getMapCutOff(true);
    const mapHp = getMapHealthCutOff(true) / calcHealthRatio(false, true, "map", level, diff);
    return Math.max(mapDmg, mapHp);
}

function getMapScore(map, modPool) {
    // mod pools are ordered from best to worst, so we invert the index to get the score
    const modScore = (modPool.length - (modPool.includes(map.bonus) ? modPool.indexOf(map.bonus) : 999));
    return [map.level, modScore]
}

function selectBetterCraftedMap(map1, map2, modPool, minLevel, maxLevel) {
    if (map2.level < minLevel || map2.level > maxLevel) {
        return map1;
    }
    if (getMapScore(map1, modPool) < getMapScore(map2, modPool)){
        return map2;
    } else {
        return map1;
    }
}

function getVoidMapScore(map) {
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
    if (getVoidMapScore(map1) > getMapScore(map2)) {
        return map2;
    } else {
        return map1;
    }
}

function shouldRunUniqueMap(map, isC2, challenge) {
    const mapData = uniqueMaps[map.name];
    if (mapData === undefined || game.global.world < mapData.zone || getMapRatio(map) > 1) {
        return false;
    }
    if (!isC2 && mapData.challenges.includes(challenge)) {
        return true;
    }
    if (mapData.speedrun && shouldSpeedRun(game.achievements[mapData.speedrun])) {
        return true;
    }

    if (map.name === 'The Block') {
        if (!game.upgrades.Shieldblock.allowed && getPageSetting('BuyShieldblock')) {
            return true;
        }
    } else if (map.name === 'The Wall') {
        if (!game.upgrades.Bounty.allowed && !game.talents.bounty.purchased) {
            return true;
        }
    } else if (map.name === 'Dimension of Anger') {
        if (!game.talents.portal.purchased && document.getElementById("portalBtn").style.display === "none") {
            return true;
        }
    } else if (map.name === 'Trimple Of Doom') {
        if (game.portal.Relentlessness.locked) {
            return true;
        }
        const trimpleZ = Math.abs(getPageSetting('TrimpleZ'));
        if (trimpleZ >= 33 && game.global.world >= trimpleZ && game.mapUnlocks.AncientTreasure.canRunOnce) {
           if (getPageSetting('TrimpleZ') < 0) {
                setPageSetting('TrimpleZ', 0);
            }
           return true;
        }
    } else {
        return false;
    }
}

function ascendingSorter(i1, i2) {
    return i1 - i2;
}

function getTargetMapLevel(challenge, isFarming, shouldFarmLowerZone, lowestSiphLvl, highestSiphLevel, isPreVoidCell) {
    let targetMapLevel = Math.max(lowestSiphLvl, 6);

    if (!getPageSetting('DynamicSiphonology') && !shouldFarmLowerZone) {
        return targetMapLevel
    }
    // For each Map Level we can go below our current zone...
    while (targetMapLevel < highestSiphLevel) {
        // Calc our Damage on this map
        let potentialHDRatio = calcHDRatio(targetMapLevel, "map", isPreVoidCell);
        if (game.unlocks.imps.Titimp) {
            potentialHDRatio /= 2;
        }

        if (game.global.world >= 60 && getHighestLevelCleared() >= 180) {
            // Use Scryer if available
            potentialHDRatio *= 2;
        } else if (game.upgrades.Dominance.done) {
            // Use Dominance if available
            potentialHDRatio /= 4;
        }

        // Stop increasing map level once we get to the right ratio. We use 1.2 here because created maps are usually shorter and easier
        if (potentialHDRatio > 1.2) break;

        targetMapLevel++;
    }

    // Keep increasing map level while we can overkill in that map
    const maxOneShot = maxOneShotPower();
    if (game.global.highestLevelCleared >= 209 && targetMapLevel >= highestSiphLevel) {
        while (oneShotZone("S", "map", targetMapLevel + 1) !== maxOneShot) {
            targetMapLevel++;
        }
    }
    // Farm on "Oneshot level" + 1, except on magma
    if (isFarming && targetMapLevel < highestSiphLevel && challenge !== "Coordinate" && !mutations.Magma.active()) {
        targetMapLevel++;
    }
    return targetMapLevel;
}

function isVanillaMAZActive() {
    if (!game.options.menu.mapAtZone.enabled || !game.global.canMapAtZone) {
        return false;
    }
    const worldZ = game.global.world;
    for (const option of game.options.menu.mapAtZone.setZone) {
        if (worldZ < option.world || worldZ > option.through) {
            continue;
        }
        if ((option.times === -1 && worldZ === option.world) || (worldZ - option.world) % option.times === 0 ) {
            if (option.cell === game.global.lastClearedCell+2) {
                return true;
            }
        }
    }
}

function resetMapSettings(prestige, isInWorld, isInMapChamber) {
    if (prestige !== "Off" && game.options.menu.mapLoot.enabled !== 1) {
        toggleSetting('mapLoot');
    }
    if (game.options.menu.exitTo.enabled !== 0) {
        toggleSetting('exitTo');
    }
    if (game.options.menu.repeatVoids.enabled !== 0) {
        toggleSetting('repeatVoids');
    }

    // Reset to defaults when on world grid
    if (isInWorld) {
        if ([1, 2, 3].includes(game.options.menu.repeatUntil.enabled)) {
            toggleSetting('repeatUntil');
        }
        if (game.global.repeatMap) {
            repeatClicked();
        }
        if (game.global.selectedMapPreset >= 4) {
            game.global.selectedMapPreset = 1;
        }
    }
    if (isInMapChamber) {
        document.getElementById('advExtraLevelSelect').value = "0";
    }

}

function getVoidMapStatus() {
    const status = {
        isPreVoidCell: false, // we have void maps, and this is a Void zone
        isVoidCell: false // isPreVoidCell + current cell allows us to actually run voids
    }
    // don't have any voids
    if (game.global.totalVoidMaps === 0) {
        return status;
    }

    const isC2 = game.global.runningChallengeSquared;
    const isDaily = challenge === "Daily";
    // running C2 and "no VMs in C2"
    if (isC2 && getPageSetting('novmsc2')) {
        return status;
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
    const minVoidZone = max(0, getPageSetting(voidMinField, 0));
    if (minVoidZone === 0) {
        return status;
    }
    let maxVoidZone = 0;
    if (!getPageSetting(voidPoisonField) || getEmpowerment() === 'Poison') {
        maxVoidZone = minVoidZone + max(0, getPageSetting(voidMaxField, 0));
    }
    // Check zone range
    if (game.global.world < minVoidZone || game.global.world > maxVoidZone) {
        return status;
    }
    // What cell to run Voids at
    const voidCell = getPageSetting(voidCellField, 90);

    status.isPreVoidCell = (game.global.lastClearedCell + 1) >= Math.floor((voidCell - 1) / 10) * 10;
    status.isVoidCell = status.isPreVoidCell && game.global.lastClearedCell + 1 >= voidCell;
    return status;
}

function autoMap() {
    resetMapSettings(prestige, isInWorld, isInMapChamber);
    AutoMapState.update();

    if (AutoMapState.target && game.options.menu.repeatUntil.enabled === 1) {
        toggleSetting('repeatUntil');
    }



    // Calculate Siphonology and Extra Map Levels
    const lowestSiphLvl = game.global.world - (shouldFarmLowerZone ? 11 : game.portal.Siphonology.level)
    const fullLootLevel = game.global.world - (game.talents.mapLoot.purchased ? 1 : 0);
    const targetMapLevel = getTargetMapLevel(challenge, isFarming, shouldFarmLowerZone, lowestSiphLvl, fullLootLevel);
    const useMods = game.global.highestLevelCleared >= 59;
    const bestMapBiome = ((!getPageSetting("PreferMetal") && game.global.decayDone) ? 'Plentiful' : 'Mountain');

    const bionicMaps = [];
    const chosenMaps = {
        unique: undefined,
        bionic: undefined,
        void: undefined,
        crafted: undefined
    };

    const modPool = (!isFarming && needPrestige ? prestigeMapMods : farmingMapMods);
    const allowUniques = getPageSetting('AutoMaps') === 1;
    const onlyStackedVoids = !isDaily && getPageSetting('onlystackedvoids');
    for (const map of game.global.mapsOwnedArray) {
        if (map.noRecycle) {
            // non-crafted maps
            if (map.location === 'Void' && doVoids && (!onlyStackedVoids || map.stacked > 0)) {
                // void maps
                chosenMaps.void = selectEasierVoidMap(chosenMaps.void, map);
            } else if (allowUniques) {
                if (shouldRunUniqueMap(map, isC2, challenge)) {
                    // unique maps
                    chosenMaps.unique = map;
                }
                if (map.location === "Bionic") {
                    // Bionic Wonderland maps
                    bionicMaps.push(map);
                }
            }
        } else {
            // crafted maps
            chosenMaps.crafted = selectBetterCraftedMap(chosenMaps.crafted, map, modPool, lowestSiphLvl, targetMapLevel);
        }
    }

    // Bionic Wonderland I+ (Unlocks, RoboTrimp, or Bionic Sniper)
    if (bionicMaps.length > 0) {
        bionicMaps.sort(ascendingSorter);
        let bionicMaxRank = 0;
        while (getMapRatio(undefined, 125 + 15 * bionicMaxRank, 2.6) <= 1) {
            bionicMaxRank++;
        }
        const tryBionicSniper = !game.achievements.oneOffs.finished[42] && (110 + 15 * bionicMaxRank) >= game.global.world + 45;
        if (bionicMaxRank > game.global.roboTrimpLevel || tryBionicSniper) {
            const bionicRank = Math.min(bionicMaps.length, bionicMaxRank);
            if (bionicRank > 0) {
                chosenMaps.bionic = bionicMaps[bionicRank-1];
            }
        }
    }

    if (chosenMaps.void || chosenMaps.bionic || chosenMaps.unique) {
        // TODO return
    }

    let tryBetterMod = false;
    let gotBetterMod = false;
    // Automaps
    if ((shouldDoMaps || doVoids || needPrestige) && !haveNonCraftedMapToRun(chosenMaps)) {
        if (preSpireFarming) {
            selectedMap = "create";
            for (const mapKey of keysSorted) {
                let iMap = game.global.mapsOwnedArray[keysSorted[i]];
                if (iMap && iMap.level >= fullLootLevel && iMap.location === bestMapBiome) {
                    selectedMap = iMap.id;
                    break;
                }
            }
        } else if (needPrestige) {
            if ((game.global.world + extraMapLevels) <= game.global.mapsOwnedArray[highestMap].level) {
                selectedMap = game.global.mapsOwnedArray[highestMap].id;
            } else {
                selectedMap = "create";
            }
        } else if (bestMap !== -1) {
            selectedMap = game.global.mapsOwnedArray[bestMap].id;
            if (useMods && !game.global.mapsOwnedArray[bestMap].hasOwnProperty("bonus")) {
                tryBetterMod = true;
            }
        }
        else if (bestOfTheRestMap !== -1) {
            selectedMap = "create";
            tryBetterMod = useMods;
        } else {
            selectedMap = "create";
        }
    }
    if ((game.global.challengeActive == 'Lead' && !challSQ) && !doVoids && (game.global.world % 2 == 0 || game.global.lastClearedCell < shouldFarmCell)) {
        if (game.global.preMapsActive)
            mapsClicked();
        return;
    }
    if (!game.global.preMapsActive && game.global.mapsActive) {
        var doDefaultMapBonus = game.global.mapBonus < maxMapBonusLimit - 1;
        if (selectedMap == game.global.currentMapId && !getCurrentMapObject().noRecycle && (doDefaultMapBonus || isVanillaMAZActive() || doMaxMapBonus || shouldFarm || needPrestige || shouldDoSpireMaps || mapExiting)) {
            //Start with Repeat on
            if (!game.global.repeatMap) {
                repeatClicked();
            }

            //End Prestige Init
            var targetPrestige = autoTrimpSettings.Prestige.selected;
            var lastPrestige = (targetPrestige && targetPrestige != "Off") ? game.mapUnlocks[targetPrestige].last : undefined;
            var lastCellPrestige = game.global.mapGridArray[game.global.mapGridArray.length - 1].special;
            var nextToLastCellPrestige = game.global.mapGridArray[game.global.mapGridArray.length - 2].special;
            var endPrestige = lastCellPrestige == targetPrestige || nextToLastCellPrestige == targetPrestige;

            //End Prestige
            if (!shouldDoMaps && endPrestige && (game.global.world + extraMapLevels) <= lastPrestige + (getScientistLevel() >= 4 && lastPrestige%10 < 6 ? 14 : 9)) {
                // console.log("debug: End Prestige");
                repeatClicked();
            }

            //Health Farming
            if (shouldDoHealthMaps && game.global.mapBonus >= maxMapBonusHealth - 1) {
                // console.log("debug: Health Farming");
                repeatClicked();
            }

            //Damage Farming
            if (doMaxMapBonus && game.global.mapBonus >= maxMapBonusLimit - 1) {
                // console.log("debug: Damage Farming");
                repeatClicked();
                doMaxMapBonus = false;
            }

            //Want to recreate the map
            if (tryBetterMod && game.resources.fragments.owned >= fragmentsNeeded) {
                // console.log("debug: Want to recreate the map");
                repeatClicked();
            }

            //Want to exit the current map to pRaid
            if (mapExiting) {
                // console.log("debug: Want to exit the current map to pRaid");
                repeatClicked();
            }
        } else {
            // console.log("debug: NOT repeating current map");
            var shouldRepeat = tryBetterMod && game.resources.fragments.owned < fragmentsNeeded;
            // maybe disable repeat
            if (game.global.repeatMap) {
                // console.log("debug: Repeat Off");
                repeatClicked();
            }

            //Turn it back on if we want to recreate a map, but don't have enough fragments
            if (tryBetterMod && game.resources.fragments.owned < fragmentsNeeded) {
                // console.log("want to recreate a map, but don't have enough fragments");
                repeatClicked();
            }
            //Force Abandon to restart void maps
            if (restartVoidMap) {
                // console.log("debug: Force Abandon to restart void maps");
                mapsClicked(true);
            }
        }
    } else if (!game.global.preMapsActive && !game.global.mapsActive) {
        if (selectedMap != "world") {
            if (!game.global.switchToMaps) {
                mapsClicked();
            }
            if ((!getPageSetting('PowerSaving') || (getPageSetting('PowerSaving') == 2) && (doVoids || AutoMapState.prepareForVoids)) && game.global.switchToMaps &&
                (needPrestige || (doVoids || AutoMapState.prepareForVoids) ||
                    ((game.global.challengeActive == 'Lead' && !challSQ) && game.global.world % 2 == 1) ||
                    (!enoughDamage && enoughHealth && game.global.lastClearedCell < 9) ||
                    (shouldFarm && game.global.lastClearedCell >= shouldFarmCell)) &&
                (
                    (game.resources.trimps.realMax() <= game.resources.trimps.owned + 1) ||
                    ((game.global.challengeActive == 'Lead' && !challSQ) && game.global.lastClearedCell > 93) ||
                    ((doVoids || AutoMapState.prepareForVoids) && game.global.lastClearedCell > voidCell - 10)
                )
            ) {
                mapsClicked();
            }
        }
    } else if (game.global.preMapsActive) {
        if (selectedMap === "world") {
            mapsClicked();
        } else if (selectedMap === "create" || tryBetterMod) {
            var $mapLevelInput = document.getElementById("mapLevelInput");
            $mapLevelInput.value = (needPrestige || targetMapLevel > game.global.world) ? game.global.world : targetMapLevel;
            if (preSpireFarming)
                $mapLevelInput.value = game.talents.mapLoot.purchased ? game.global.world - 1 : game.global.world;
            var decrement, tier;
            if (game.global.world >= mapTierZone[0]) {
                tier = mapTier0Sliders;
                decrement = [];
            }
            else if (game.global.world >= mapTierZone[1]) {
                tier = mapTier1Sliders;
                decrement = ['loot'];
            }
            else if (game.global.world >= mapTierZone[2]) {
                tier = mapTier2Sliders;
                decrement = ['loot'];
            }
            else {
                tier = mapTier2Sliders;
                decrement = ['diff', 'loot'];
            }

            sizeAdvMapsRange.value = tier[0];
            adjustMap('size', tier[0]);
            difficultyAdvMapsRange.value = tier[1];
            adjustMap('difficulty', tier[1]);
            lootAdvMapsRange.value = tier[2];
            adjustMap('loot', tier[2]);
            biomeAdvMapsSelect.value = autoTrimpSettings.mapselection.selected == "Gardens" ? (game.global.decayDone ? "Plentiful" : "Random") : autoTrimpSettings.mapselection.selected;
            updateMapCost();
            if (shouldFarm || game.global.challengeActive == 'Metal') {
                biomeAdvMapsSelect.value = game.global.decayDone ? "Plentiful" : "Mountain";
                updateMapCost();
            }
            if (updateMapCost(true) > game.resources.fragments.owned) {
                if (needPrestige && !enoughDamage) decrement.push('diff');
                if (shouldFarm) decrement.push('size');
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
            if (getPageSetting('AdvMapSpecialModifier')) {
                if (targetMapLevel > fullLootLevel) {
                    //TODO -- Buggy when we don't have fragments to create any map with modifiers
                    //Finds the highest map level we can buy modifiers for, plus one
                    while (game.global.world + getExtraMapLevels() <= targetMapLevel && checkMapMods(true))
                        document.getElementById('advExtraLevelSelect').value++;

                    //Since we can't create a map for zone X + 1, target zone X
                    if (getExtraMapLevels() > 0) document.getElementById('advExtraLevelSelect').value--;

                    //Reduce our map zone to world - 1 if we can't create a map for world + 0
                    if (game.talents.mapLoot.purchased && getExtraMapLevels() == 0) $mapLevelInput.value--;

                    //Update our control flags
                    extraMapLevels = getExtraMapLevels();
                    gotBetterMod = parseInt($mapLevelInput.value) + getExtraMapLevels() > altSiphLevel && checkMapMods(true);
                }
                else {
                    gotBetterMod = checkMapMods(tryBetterMod);
                }
            }
            var mapLvlPicked = parseInt($mapLevelInput.value) + (getPageSetting('AdvMapSpecialModifier') ? getExtraMapLevels() : 0);

            //Sorry for the mess, this whole thing needs a rework
            if (tryBetterMod) {
                if (gotBetterMod && game.resources.fragments.owned >= updateMapCost(true)) {
                    fragmentsNeeded = 0;
                    if (bestMap != -1) {
                        debug("Recreating map level #" + mapLvlPicked + " to include a modifier", "maps", '*happy2');
                        recycleMap(bestMap);
                    }
                }
                else if (bestOfTheRestMap != -1) {
                    selectedMap = game.global.mapsOwnedArray[bestOfTheRestMap].id;
                    selectMap(selectedMap);
                    var mapObject = game.global.mapsOwnedArray[getMapIndex(selectedMap)];
                    var lvlText = " Level: " + mapObject.level;
                    runMap();
                    if (lastMapWeWereIn != getCurrentMapObject()) debug("Running alternative map " + selectedMap + lvlText + " Name: " + mapObject.name, "maps", 'th-large');
                    lastMapWeWereIn = getCurrentMapObject();
                    return;
                }
                else if (bestMap != -1) {
                    selectMap(selectedMap);
                    var themapobj = game.global.mapsOwnedArray[getMapIndex(selectedMap)];
                    var levelText = " Level: " + themapobj.level;
                    var voidorLevelText = themapobj.location == "Void" ? " Void: " : levelText;
                    runMap();
                    debug("Running selected " + selectedMap + voidorLevelText + " Name: " + themapobj.name, "maps", 'th-large');
                    lastMapWeWereIn = getCurrentMapObject();
                    return;
                }
            }

            //No fragments to create a map
            if (updateMapCost(true) > game.resources.fragments.owned) {
                selectMap(game.global.mapsOwnedArray[highestMap].id);
                debug("Can't afford the map we designed, #" + mapLvlPicked, "maps", '*crying2');
                debug("...selected our highest map instead # " + game.global.mapsOwnedArray[highestMap].id + " Level: " + game.global.mapsOwnedArray[highestMap].level, "maps", '*happy2');
                runMap();
                lastMapWeWereIn = getCurrentMapObject();
            } else {
                var result = buyMap();
                debug("Buying a Map, level: #" + mapLvlPicked + " for " + prettify(updateMapCost(true)) + " fragments", "maps", 'th-large');
                if (result == -2) {
                    debug("Too many maps, recycling now: ", "maps", 'th-large');
                    recycleBelow(true);
                    debug("Retrying, Buying a Map, level: #" + mapLvlPicked, "maps", 'th-large');
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
            var levelText = " Level: " + themapobj.level;
            var voidorLevelText = themapobj.location == "Void" ? " Void: " : levelText;
            runMap();
            debug("Running selected " + selectedMap + voidorLevelText + " Name: " + themapobj.name, "maps", 'th-large');
            lastMapWeWereIn = getCurrentMapObject();
            fragmentsNeeded = 0;
        }
    }
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
var RscryerStuck = !1;
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
    var customVars = MODULES["maps"];
    if (game.global.repeatMap == true && !game.global.mapsActive && !game.global.preMapsActive) repeatClicked();
    if ((game.options.menu.repeatUntil.enabled == 1 || game.options.menu.repeatUntil.enabled == 2 || game.options.menu.repeatUntil.enabled == 3) && !game.global.mapsActive && !game.global.preMapsActive) toggleSetting('repeatUntil');
    if (game.options.menu.exitTo.enabled != 0) toggleSetting('exitTo');
    if (game.options.menu.repeatVoids.enabled != 0) toggleSetting('repeatVoids');
    var extraMapLevels = 0;
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
        RshouldDoMaps = (!RenoughDamage || RshouldFarm || RscryerStuck);
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
                    (RshouldFarm && game.global.lastClearedCell >= customVars.RshouldFarmCell) ||
                    (RscryerStuck)) &&
                (
                    (game.resources.trimps.realMax() <= game.resources.trimps.owned + 1) ||
                    (RdoVoids && game.global.lastClearedCell > 70)
                )
            ) {
                if (RscryerStuck) {
                    debug("Got perma-stuck on cell " + (game.global.lastClearedCell + 2) + " during scryer stance. Are your scryer settings correct? Entering map to farm to fix it.");
                }
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
            if (game.global.world >= customVars.RMapTierZone[0]) {
                tier = customVars.RMapTier0Sliders;
                decrement = [];
            } else if (game.global.world >= customVars.RMapTierZone[1]) {
                tier = customVars.RMapTier1Sliders;
                decrement = ['loot'];
            } else if (game.global.world >= customVars.RMapTierZone[2]) {
                tier = customVars.RMapTier2Sliders;
                decrement = ['loot'];
            } else {
                tier = customVars.RMapTier3Sliders;
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
