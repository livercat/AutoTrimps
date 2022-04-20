var wantToScry = false;
var transitionRequired = false;

function scryingCorruption() {
    //Defines if it should be scrying vs corrupted enemies at this moment
    var minZoneOK = game.global.world >= getPageSetting('ScryerMinZone');
    var maxZoneOK = game.global.world < getPageSetting('ScryerMaxZone') || getPageSetting('ScryerMaxZone') < 1;
    var scryZone = minZoneOK && maxZoneOK || getPageSetting('onlyminmaxworld') >= 2;
    var scryCorrupt = scryZone && getPageSetting('ScryerSkipCorrupteds2') != 0 || getPageSetting('ScryerSkipCorrupteds2') == 1;
    var essenceLeft = getPageSetting('screwessence') == false || countRemainingEssenceDrops() >= 1;
    var die = getPageSetting('ScryerDieZ') != -1 && game.global.world >= getPageSetting('ScryerDieZ')
    return (die || scryCorrupt) && essenceLeft && getPageSetting('UseScryerStance') == true;
}

function readyToSwitch(stance = "S") {
    //Suicide to Scry
    var essenceLeft = getPageSetting('screwessence') == false || countRemainingEssenceDrops() >= 1;
    var die = getPageSetting('ScryerDieZ') != -1 && game.global.world >= getPageSetting('ScryerDieZ') && essenceLeft;
    var willSuicide = getPageSetting('ScryerDieZ');

    //Check if we are allowed to suicide in our current cell and zone
    if (die && willSuicide >= 0) {
        var [dieZ, dieC] = willSuicide.toString().split(".");
        if (dieC && dieC.length == 1) dieC = dieC + "0";
        die = game.global.world >= dieZ && (!dieC || (game.global.lastClearedCell + 1 >= dieC));
    }

    return die || survive(stance, 2);
}

function useScryerStance(hdStats) {
    const wsZone = (game.global.challengeActive === "Daily" ? getPageSetting('dWindStackingMin') : getPageSetting('WindStackingMin'));
    const stackLiquimp = getPageSetting('liqstack');
    const curEnemy = getCurrentEnemy();
    const oneShotCells = oneShotPower('S');
    const isActiveSpire = isActiveSpireAT() || disActiveSpireAT();
    let useW = false;
    if (game.global.uberNature === "Wind") {
        if (getEmpowerment() !== "Wind") {
            // in non-wind zones, we can safely use W instead of S
            useW = true;
        } else if (wsZone !== -1 && game.global.world >= wsZone && !game.global.mapsActive && !isActiveSpire) {
            // if windstacking is enabled, and we're in the correct zone, maybe use W
            let offset = 1;
            while (offset <= Math.max(1, oneShotCells)) {
                const enemy = getCurrentEnemy(offset);
                if (enemy && (["Healthy", "Corruption"].includes(enemy.mutation) || enemy.name === 'Omnipotrimp')) {
                    useW = true;
                    break;
                }
                offset += 1;
            }
        } else if (stackLiquimp) {
            const enemy = getCurrentEnemy();
            useW = enemy && enemy.name.includes('Liquimp');
        }
    }
    let scryF, scry, x;
    if (useW) {
        scryF = 'W';
        scry = 5;
        x = 5;
    } else {
        scryF = 'S';
        scry = 4; // 'S' formation
        x = 0; // 'X' formation
    }
    
    const AutoStance = getPageSetting('AutoStance');
    function autoStanceFunctionScryer() {
        if ((getPageSetting('AutoStance') == 3) || (getPageSetting('use3daily') == true && game.global.challengeActive == "Daily")) windStance(hdStats);
        else if (AutoStance==1) autoStance();
        else if (AutoStance==2) autoStance2();
    }

    //Never
    const aboveMaxZone = getPageSetting('ScryerMaxZone') > 0 && game.global.world >= getPageSetting('ScryerMaxZone');
    const USS = getPageSetting('UseScryerStance'), MA = game.global.mapsActive, SC = getPageSetting('ScryerSkipCorrupteds2') == 0;
    let never_scry  = game.global.preMapsActive || game.global.gridArray.length === 0 || game.global.world <= 60 || game.global.highestLevelCleared < 180;
        never_scry |= USS &&  MA && getPageSetting('ScryerUseinMaps2') == 0 && getCurrentMapObject().location != "Void" && getCurrentMapObject().location != "Bionic" && getCurrentMapObject().level <= game.global.world;
        never_scry |= USS &&  MA && getPageSetting('ScryerUseinPMaps') == 0 && getCurrentMapObject().level > game.global.world && getCurrentMapObject().location != "Void" && getCurrentMapObject().location != "Bionic";
        never_scry |= USS &&  MA && getCurrentMapObject().location == "Void" && getPageSetting('ScryerUseinVoidMaps2') == 0;
        never_scry |= USS &&  MA && getCurrentMapObject().location == "Bionic" && getPageSetting('ScryerUseinBW') == 0;
        never_scry |= USS && !MA && (isActiveSpireAT() || disActiveSpireAT()) && getPageSetting('ScryerUseinSpire2') == 0;
        never_scry |= USS && !MA && getPageSetting('ScryerSkipBoss2') == 1 && game.global.world < getPageSetting('VoidMaps') && game.global.lastClearedCell == 98;
        never_scry |= USS && !MA && getPageSetting('ScryerSkipBoss2') == 0 && game.global.lastClearedCell == 98;
        never_scry |= USS && !MA && (getEmpowerment() == "Poison" && (getPageSetting('ScryUseinPoison') == 0 || (getPageSetting('ScryUseinPoison') > 0 && game.global.world >= getPageSetting('ScryUseinPoison')))) || (getEmpowerment() == "Wind" && (getPageSetting('ScryUseinWind') == 0 || (getPageSetting('ScryUseinWind') > 0 && game.global.world >= getPageSetting('ScryUseinWind')))) || (getEmpowerment() == "Ice" && (getPageSetting('ScryUseinIce') == 0 || (getPageSetting('ScryUseinIce') > 0 && game.global.world >= getPageSetting('ScryUseinIce'))));
    //Check Corrupted Never
    const isCorrupt = getCurrentEnemy(1) && getCurrentEnemy(1).mutation == "Corruption";
    const isHealthy = curEnemy && curEnemy.mutation === "Healthy";
    const nextIsCorrupt = getCurrentEnemy(2) && getCurrentEnemy(2).mutation == "Corruption";
    const scryNext = !nextIsCorrupt && (transitionRequired || oneShotPower(undefined, 0, true));
    const skipOnMaxZone = getPageSetting('onlyminmaxworld') == 2 && getPageSetting('ScryerSkipCorrupteds2') != 1 && aboveMaxZone;
    if (USS && !MA && (SC || skipOnMaxZone) && isCorrupt) {
        transitionRequired = scryNext;
        never_scry |= !scryNext;
    }
    else transitionRequired = false;

    //check Healthy never -- TODO
    if (never_scry || getPageSetting('UseScryerStance') == true && !game.global.mapsActive && (isHealthy && getPageSetting('ScryerSkipHealthy') == 0)) {
        autoStanceFunctionScryer();
        wantToScry = false;
        return;
    }

    //Force
    let use_scryer  = getPageSetting('UseScryerStance') == true && game.global.mapsActive && getPageSetting('ScryerUseinMaps2') == 1;
        use_scryer |= game.global.mapsActive && getCurrentMapObject().location == "Void" && ((getPageSetting('ScryerUseinVoidMaps2') == 1) || (getPageSetting('scryvoidmaps') == true && game.global.challengeActive != "Daily") || (getPageSetting('dscryvoidmaps')== true && game.global.challengeActive == "Daily"));
        use_scryer |= game.global.mapsActive && getCurrentMapObject().location == "Bionic" && getPageSetting('ScryerUseinBW') == 1;
        use_scryer |= game.global.mapsActive && getCurrentMapObject().level > game.global.world && getPageSetting('ScryerUseinPMaps') == 1 && getCurrentMapObject().location != "Bionic";
        use_scryer |= !game.global.mapsActive && getPageSetting('UseScryerStance') == true && (isActiveSpireAT() || disActiveSpireAT()) && getPageSetting('ScryerUseinSpire2') == 1;
        use_scryer |= !game.global.mapsActive && getPageSetting('UseScryerStance') == true && ((getEmpowerment() == "Poison" && getPageSetting('ScryUseinPoison') > 0 && game.global.world < getPageSetting('ScryUseinPoison')) || (getEmpowerment() == "Wind" && getPageSetting('ScryUseinWind') > 0 && game.global.world < getPageSetting('ScryUseinWind')) || (getEmpowerment() == "Ice" && getPageSetting('ScryUseinIce') > 0 && game.global.world < getPageSetting('ScryUseinIce')));
    //Farm easy maps on scryer
    if (game.global.mapsActive) {
        const farmScry = shouldFarm || shouldFarmDamage || !enoughHealth || preSpireFarming;
        const mapRatio = calcHDRatio(getCurrentMapObject().level, "map") <= (game.unlocks.imps.Titimp ? 4 : 3);
        use_scryer |= getCurrentMapObject().location != "Void" && farmScry && mapRatio; //Farm maps on scryer
    }
    //check Corrupted Force
    if ((isCorrupt && getPageSetting('ScryerSkipCorrupteds2') == 1 && getPageSetting('UseScryerStance') == true) || (use_scryer)) {
        setFormation(scry);
        wantToScry = true;
        return;
    }
    //check healthy force
    if ((isHealthy && getPageSetting('ScryerSkipHealthy') == 1 && getPageSetting('UseScryerStance') == true) || (use_scryer)) {
        setFormation(scry);
        wantToScry = true;
        return;
    }

    //Calc Damage
    if (AutoStance>=1) calcBaseDamageInX();

    //Checks if Overkill is allowed
    let useOverkill = getPageSetting('UseScryerStance') == true && getPageSetting('ScryerUseWhenOverkill');
        useOverkill &= !(getPageSetting('ScryerUseinSpire2') == 0 && !game.global.mapsActive && (isActiveSpireAT() || disActiveSpireAT()));

    //Overkill
    if (useOverkill && getCurrentEnemy()) {
        //Switches to S/W if it has enough damage to secure an overkill
        const HS = oneShotPower(scryF);
        const HSD = oneShotPower("D", 0, true);
        const HS_next = oneShotPower(scryF, 1);
        const HSD_next = oneShotPower("D", 1, true);
        if (readyToSwitch() && HS > 0 && HS >= HSD && (HS > 1 || HS_next > 0 && HS_next >= HSD_next)) {
            setFormation(scry);
            return;
        }
    }
    
    //No Essence
    if (USS && !MA && getPageSetting('screwessence') == true && countRemainingEssenceDrops() < 1 && scryF === 'S') {
        autoStanceFunctionScryer();
        wantToScry = false;
        return;
    }

    //Default
    const min_zone = getPageSetting('ScryerMinZone');
    const max_zone = getPageSetting('ScryerMaxZone');
    const valid_min = game.global.world >= min_zone && game.global.world > 60;
    const valid_max = max_zone <= 0 || game.global.world < max_zone;

    if (USS && valid_min && valid_max && (!MA || getPageSetting('onlyminmaxworld') === 0) && readyToSwitch()) {
        //Smooth transition to S before killing the target
        if (transitionRequired) {
            for (let cp=2; cp >= -2; cp--) {
                if      (survive("D",  cp) && !oneShotPower("D", 0, true)) {setFormation(2); return;}
                else if (survive("XB", cp) && !oneShotPower("X", 0, true)) {setFormation(x); return;}
                else if (survive("B",  cp) && !oneShotPower("B", 0, true)) {setFormation(3); return;}
                else if (survive("X",  cp) && !oneShotPower("X", 0, true)) {setFormation(x); return;}
                else if (survive("H",  cp) && !oneShotPower("H", 0, true)) {setFormation(1); return;}
            }
        }

        //Set to scry if it won't kill us, or we are willing to die for it
        setFormation(scry);
        wantToScry = true;
        return;
    }

    //No reason to Scry
    autoStanceFunctionScryer();
    wantToScry = false;
}
