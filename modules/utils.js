if (!String.prototype.includes) {
    String.prototype.includes = function(search, start) {
        'use strict';
        if (typeof start !== 'number') {
            start = 0;
        }
        if (start + search.length > this.length) {
            return false;
        } else {
            return this.indexOf(search, start) !== -1;
        }
    };
}

function loadPageVariables() {
    var tmp = JSON.parse(localStorage.getItem('autoTrimpSettings'));
    if (tmp !== null && tmp['ATversion'] != undefined) {
        autoTrimpSettings = tmp;
    }
}

function safeSetItems(a,b){try{localStorage.setItem(a,b)}catch(c){22==c.code&&debug("Error: LocalStorage is full, or error. Attempt to delete some portals from your graph or restart browser.")}}

function serializeSettings() {
    return JSON.stringify(Object.keys(autoTrimpSettings).reduce((v, k) => {
        const el = autoTrimpSettings[k];
        switch (el.type) {
        case 'boolean':
            return v[k] = el.enabled, v;
        case 'value':
        case 'multiValue':
        case 'textValue':
        case 'valueNegative':
        case 'multitoggle':
            return v[k] = el.value, v;
        case 'dropdown':
            return v[k] = el.selected, v;
        }
        return v[k] = el, v;
    }, {}));
}

function serializeSettings60() {
    return {"ManualGather2":1,"ATversion":"ZekRayDee v5.2","gathermetal":false,"BuyUpgradesNew":1,"amalcoord":false,"amalcoordt":-1,"amalcoordhd":0.0000025,"amalcoordz":-1,"AutoAllocatePerks":0,"fastallocate":false,"TrapTrimps":true,"AutoEggs":false,"RManualGather2":1,"RTrapTrimps":true,"RBuyUpgradesNew":1,"RAutoAllocatePerks":0,"Rdumpgreed":false,"AutoPortal":"Off","HeliumHourChallenge":"None","CustomAutoPortal":"999","HeHrDontPortalBefore":"999","HeliumHrBuffer":"0","RAutoPortal":"Off","RadonHourChallenge":"None","RCustomAutoPortal":"999","RnHrDontPortalBefore":"999","RadonHrBuffer":"0","PauseScript":false,"radonsettings":0,"buyheliumy":-1,"dfightforever":"0","avoidempower":true,"darmormagic":0,"dscryvoidmaps":false,"dMaxMapBonushealth":"10","dIgnoreSpiresUntil":"200","dExitSpireCell":-1,"dPreSpireNurseries":-1,"use3daily":false,"dWindStackingMin":"-1","dWindStackingMinHD":"-1","dWindStackingMax":"200","dwindcutoff":"-1","dwindcutoffmap":"-1","liqstack":false,"dwsmax":"-1","dwsmaxhd":"-1","dPraidingzone":[-1],"dPraidingcell":-1,"dPraidingHD":-1,"dPraidingP":-1,"dPraidingI":-1,"dPraidHarder":false,"dMaxPraidZone":[-1],"dPraidFarmFragsZ":[-1],"dPraidBeforeFarmZ":[-1],"Dailybwraid":false,"dbwraidcell":-1,"dBWraidingz":[-1],"dBWraidingmax":[-1],"buyradony":-1,"Rdfightforever":"0","Ravoidempower":true,"Rdarmormagic":0,"Rdscryvoidmaps":false,"RdPraidingzone":[-1],"RdPraidHarder":false,"RdMaxPraidZone":[-1],"RdPraidFarmFragsZ":[-1],"RdPraidBeforeFarmZ":[-1],"RDailybwraid":false,"RdBWraidingz":[-1],"RdBWraidingmax":[-1],"dhighdmg":"undefined","dlowdmg":"undefined","AutoStartDaily":false,"u2daily":false,"AutoPortalDaily":"0","dHeliumHourChallenge":"None","dCustomAutoPortal":"999","dHeHrDontPortalBefore":"999","dHeliumHrBuffer":"0","DailyVoidMod":-1,"dvoidscell":"-1","dRunNewVoidsUntilNew":"0","drunnewvoidspoison":false,"RAutoStartDaily":false,"u1daily":false,"RAutoPortalDaily":"0","RdHeliumHourChallenge":"None","RdCustomAutoPortal":"999","RdHeHrDontPortalBefore":"999","RdHeliumHrBuffer":"0","RDailyVoidMod":-1,"RdRunNewVoidsUntilNew":"0","FinishC2":-1,"buynojobsc":"false","cfightforever":"false","carmormagic":0,"mapc2hd":"-1","novmsc2":"false","c2runnerstart":false,"c2runnerportal":"999","c2runnerpercent":"85","hidebuildings":false,"BuyBuildingsNew":1,"WarpstationCap":true,"WarpstationCoordBuy":true,"GemEfficiencyIgnoresMax":"true","FoodEfficiencyIgnoresMax":"true","FirstGigastation":"20","DeltaGigastation":"2","MaxHut":"100","MaxHouse":"100","MaxMansion":"100","MaxHotel":"100","MaxResort":"100","MaxCollector":"-1","MaxGateway":"25","MaxWormhole":"0","MaxTribute":"-1","MaxGym":"-1","GymWall":-1,"GatewayWall":10,"WarpstationWall3":-1,"NurseryWall":10,"MaxNursery":"-1","NoNurseriesUntil":"-1","AdvancedNurseries":"true","AutoGigas":"true","CustomTargetZone":"-1","CustomDeltaFactor":"-1","RBuyBuildingsNew":"true","RMaxHut":"100","RMaxHouse":"100","RMaxMansion":"100","RMaxHotel":"100","RMaxResort":"100","RMaxGateway":"25","RMaxCollector":"-1","RMaxTribute":"-1","RMaxLabs":"0","Rmeltsmithy":"-1","Rsmithylogic":"false","Rsmithynumber":"-1","Rsmithypercent":"-1","Rsmithyseconds":"-1","fuckjobs":"false","BuyJobsNew":1,"AutoMagmamancers":true,"FarmerRatio":1.1,"LumberjackRatio":1.15,"MinerRatio":1.2,"MaxScientists":"-1","MaxExplorers":"-1","MaxTrainers":"-1","RBuyJobsNew":1,"RFarmerRatio":"1","RLumberjackRatio":"1","RMinerRatio":"1","RMaxExplorers":"-1","Rshipfarmon":"false","Rshipfarmzone":[-1],"Rshipfarmcell":"-1","Rshipfarmamount":[-1],"Rshipfarmlevel":[0],"Rshipfarmfrag":"false","BuyArmorNew":1,"BuyWeaponsNew":1,"CapEquip2":10,"CapEquiparm":10,"dmgcuntoff":"4","DynamicPrestige2":-1,"Prestige":"Dagadder","ForcePresZ":-1,"PrestigeSkip1_2":0,"DelayArmorWhenNeeded":true,"BuyShieldblock":true,"trimpsnotdie":false,"gearamounttobuy":3,"always2":false,"Requipon":false,"Rdmgcuntoff":"1","Requipamount":1,"Requipcapattack":50,"Requipcaphealth":50,"Requipzone":-1,"Requippercent":1,"Requip2":true,"Requipfarmon":false,"Requipfarmzone":"-1","RequipfarmHD":"-1","Requipfarmmult":"-1","Requipfarmhits":"-1","AutoMaps":1,"automapsportal":true,"LowerFarmingZone":true,"FarmWhenNomStacks7":false,"FarmOnLowHealth":true,"TrimpleZ":0,"MaxMapBonusAfterZone":"-1","MaxMapBonuslimit":"10","MaxMapBonushealth":"10","mapcuntoff":"4","DisableFarm":64,"NumHitsSurvived":1.5,"VoidMaps":0,"RunNewVoidsUntilNew":"0","voidscell":"-1","VoidHDMult":"1","VoidHitsMult":"2","runnewvoidspoison":false,"onlystackedvoids":false,"scryvoidmaps":false,"buywepsvoid":false,"RAutoMaps":1,"Rautomapsportal":true,"Rmapselection":"Mountain","RMaxMapBonusAfterZone":"-1","RMaxMapBonuslimit":"10","RMaxMapBonushealth":"10","Rhitssurvived":"10","Rmapcuntoff":"4","RDisableFarm":-1,"RVoidMaps":"0","Rvoidscell":"-1","RRunNewVoidsUntilNew":"0","Rprispalace":true,"Rmeltpoint":[-1],"Rtimefarm":false,"Rtimefarmzone":[-1],"Rtimefarmcell":"-1","Rtimefarmtribute":false,"Rtimefarmbog":false,"Rtimefarmtime":[-1],"Rtimemaplevel":[0],"Rtimemapselection":"Sea","Rtimespecialselection":"0","Rtimegatherselection":"0","MaxStacksForSpire":false,"MinutestoFarmBeforeSpire":"0","IgnoreSpiresUntil":"200","ExitSpireCell":30,"SpireBreedTimer":-1,"PreSpireNurseries":-1,"spireshitbuy":false,"SkipSpires":false,"SpireHD":"64","SpireHitsSurvived":"10","Praidingzone":[-1],"Praidingcell":-1,"PraidingHD":-1,"PraidingP":-1,"PraidingI":-1,"PraidHarder":false,"MaxPraidZone":[-1],"PraidFarmFragsZ":[-1],"PraidBeforeFarmZ":[-1],"BWraid":false,"bwraidcell":-1,"BWraidingz":[-1],"BWraidingmax":[-1],"RPraidingzone":[-1],"RPraidingcell":-1,"RPraidHarder":false,"RMaxPraidZone":[-1],"RPraidFarmFragsZ":[-1],"RPraidBeforeFarmZ":[-1],"RBWraid":false,"RBWraidingz":[-1],"RBWraidingmax":[-1],"RAMPraid":false,"RAMPraidzone":[-1],"RAMPraidraid":[-1],"RAMPraidcell":-1,"RAMPraidfrag":0,"RAMPraidrecycle":false,"turnwson":"false","WindStackingMin":"-1","WindStackingMinHD":"-1","WindStackingMax":"200","windcutoff":"-1","windcutoffmap":"-1","wsmax":"-1","wsmaxhd":"-1","ATGA2":true,"ATGA2gen":"1","ATGA2timer":30,"zATGA2timer":"-1","ztATGA2timer":"-1","ATGA2timerz":"-1","ATGA2timerzt":"-1","sATGA2timer":"-1","dsATGA2timer":"-1","dATGA2Auto":2,"dATGA2timer":"-1","dhATGA2timer":"-1","cATGA2timer":"-1","chATGA2timer":3,"DecayStacksToPush":"300","DecayStacksToAbandon":"600","Rblackbog":false,"Rblackbogzone":[-1],"Rblackbogamount":[-1],"Rarchon":"false","Rarchstring1":"undefined","Rarchstring2":"undefined","Rarchstring3":"undefined","Rmayhemon":"false","Rmayhemattack":"false","Rmayhemhealth":"false","Rmayhemabcut":"-1","Rmayhemamcut":"-1","Rmayhemhcut":"-1","Rmayhemmap":0,"Rstormon":"false","Rstormzone":"-1","RstormHD":"-1","Rstormmult":"-1","Rinsanityon":"false","Rinsanityfarmzone":[-1],"Rinsanityfarmcell":"-1","Rinsanityfarmstack":[-1],"Rinsanityfarmlevel":[0],"Rinsanityfarmfrag":"false","Rexterminateon":"false","Rexterminatecalc":"false","Rexterminateeq":"false","Rnurtureon":"false","BetterAutoFight":2,"AutoStance":1,"IgnoreCrits":0,"PowerSaving":0,"ForceAbandon":true,"DynamicGyms":true,"AutoRoboTrimp":"60","fightforever":"-1","addpoison":"false","fullice":"false","45stacks":"false","Rfightforever":"-1","Rcalcmaxequality":0,"Rmanageequality":"false","UseScryerStance":true,"ScryerUseWhenOverkill":true,"ScryerMinZone":"181","ScryerMaxZone":-1,"onlyminmaxworld":2,"ScryerUseinMaps2":2,"ScryerUseinVoidMaps2":0,"ScryerUseinPMaps":0,"ScryerUseinBW":0,"ScryerUseinSpire2":0,"ScryerSkipBoss2":0,"ScryerSkipCorrupteds2":0,"ScryerSkipHealthy":2,"ScryUseinPoison":-1,"ScryUseinWind":-1,"ScryUseinIce":-1,"ScryerDieZ":181,"screwessence":true,"ScryerMinAtFuel":true,"ScryerHDDiv":"4","ScryerHitsMult":"8","UseAutoGen":true,"AutoFuelZone":true,"beforegen":2,"fuellater":230,"fuelend":230,"defaultgen":2,"AutoGenDC":1,"AutoGenC2":0,"spendmagmite":1,"ratiospend":false,"effratio":-1,"capratio":-1,"supratio":-1,"ocratio":-1,"SupplyWall":0.4,"spendmagmitesetting":0,"ZonesBeforeSupply":5,"TotalZonesToFuel":20,"highdmg":"undefined","lowdmg":"undefined","Rhs":false,"Rhsshield":false,"Rhsz":"-1","Rhs1":"undefined","Rhs2":"undefined","Rhsstaff":false,"Rhsworldstaff":"undefined","Rhsmapstaff":"undefined","Rhstributestaff":"undefined","autoheirlooms":false,"typetokeep":0,"raretokeep":"Any","keepshields":false,"slot1modsh":"empty","slot2modsh":"empty","slot3modsh":"empty","slot4modsh":"empty","slot5modsh":"empty","slot6modsh":"empty","keepstaffs":false,"slot1modst":"empty","slot2modst":"empty","slot3modst":"empty","slot4modst":"empty","slot5modst":"empty","slot6modst":"empty","keepcores":false,"slot1modcr":"empty","slot2modcr":"empty","slot3modcr":"empty","slot4modcr":"empty","AutoGoldenUpgrades":"Off","dAutoGoldenUpgrades":"Off","cAutoGoldenUpgrades":"Off","voidheliumbattle":-1,"dvoidheliumbattle":-1,"radonbattle":-1,"dradonbattle":-1,"battleradon":-1,"dbattleradon":-1,"RAutoGoldenUpgrades":"Off","RdAutoGoldenUpgrades":"Off","RcAutoGoldenUpgrades":"Off","Rvoidheliumbattle":-1,"Rdvoidheliumbattle":-1,"Rradonbattle":-1,"Rdradonbattle":-1,"Rbattleradon":-1,"Rdbattleradon":-1,"AutoNatureTokens":false,"tokenthresh":-1,"AutoPoison":"Off","AutoWind":"Off","AutoIce":"Off","autoenlight":false,"pfillerenlightthresh":-1,"wfillerenlightthresh":-1,"ifillerenlightthresh":-1,"pdailyenlightthresh":-1,"wdailyenlightthresh":-1,"idailyenlightthresh":-1,"pc2enlightthresh":-1,"wc2enlightthresh":-1,"ic2enlightthresh":-1,"EnhanceGrids":true,"showbreedtimer":true,"showautomapstatus":true,"Rshowautomapstatus":true,"SpamGeneral":true,"SpamUpgrades":true,"SpamEquipment":true,"SpamMaps":true,"SpamOther":true,"SpamBuilding":true,"SpamJobs":false,"SpamGraphs":true,"SpamMagmite":true,"SpamPerks":true,"SpamNature":true,"SpamDevDebug":false};
}
function serializeSettings550() {
    return '{"ManualGather2":2,"ATversion":"2.1.6.9b-genbtc-4-2-2018 + KFrowde + Zeker0","BetterAutoFight":3,"AutoStance":2,"BuyStorage":true,"BuyBuildings":true,"BuyUpgrades":true,"BuyJobs":true,"TrapTrimps":false,"AutoHeirlooms":true,"HireScientists":true,"WorkerRatios":false,"ManageBreedtimer":false,"AutoPortal":"Custom","HeliumHourChallenge":"Corrupted","CustomAutoPortal":560,"HeHrDontPortalBefore":496,"HeliumHrBuffer":3,"AutoFinishDaily":true,"AutoFinishDailyZone":0,"AutoStartDaily":true,"PauseScript":false,"BuyArmor":true,"BuyArmorUpgrades":true,"BuyWeapons":true,"BuyWeaponUpgrades":true,"BuyShieldblock":false,"Prestige":"Dagadder","PrestigeBackup":{"selected":"Dagadder","id":"PrestigeBackup","name":"PrestigeBackup"},"DynamicPrestige2":-1,"PrestigeSkipMode":false,"AlwaysArmorLvl2":true,"WaitTill60":true,"DelayArmorWhenNeeded":false,"CapEquip2":200,"AutoMaps":1,"DynamicSiphonology":true,"LowerFarmingZone":true,"MinutestoFarmBeforeSpire":0,"RunBionicBeforeSpire":false,"ExitSpireCell":-1,"CorruptionCalc":true,"FarmWhenNomStacks7":true,"VoidMaps":555,"RunNewVoids":false,"RunNewVoidsUntil":600,"VoidCheck":1,"MaxTox":false,"DisableFarm":-1,"FarmerRatio":20,"LumberjackRatio":10,"MinerRatio":1000,"MaxScientists":"-1","MaxExplorers":3000,"MaxTrainers":-1,"MaxHut":100,"MaxHouse":0,"MaxMansion":0,"MaxHotel":0,"MaxResort":0,"MaxGateway":0,"MaxWormhole":0,"MaxCollector":0,"FirstGigastation":1,"DeltaGigastation":1,"MaxGym":"-1","MaxTribute":"-1","MaxNursery":-1,"BreedFire":false,"AutoMagmamancers":false,"WarpstationCap":false,"WarpstationWall3":-1,"WarpstationCoordBuy":false,"AutoRoboTrimp":270,"AutoGoldenUpgrades":"Void 60","AutoHeirlooms2":false,"AutoUpgradeHeirlooms":false,"TrainerCaptoTributes":"-1","NoNurseriesUntil":498,"AutoMagmiteSpender2":2,"ForceAbandon":true,"GymWall":-1,"DynamicGyms":true,"AutoAllocatePerks":2,"SpireBreedTimer":-1,"UseScryerStance":false,"ScryerUseWhenOverkill":false,"ScryerMinZone":530,"ScryerMaxZone":-1,"ScryerUseinMaps2":0,"ScryerUseinVoidMaps2":0,"ScryerUseinSpire2":0,"ScryerSkipBoss2":0,"ScryerSkipCorrupteds2":2,"ScryerDieToUseS":true,"SpamGeneral":true,"SpamUpgrades":false,"SpamEquipment":false,"SpamMaps":false,"SpamOther":false,"SpamBuilding":false,"SpamJobs":false,"ManualCoords":false,"TrimpleZ":0,"ScryerDieZ":230.6,"IgnoreCrits":2,"ForcePresZ":-1,"PreferMetal":false,"PreSpireNurseries":7000,"FinishC2":-1,"PowerSaving":0,"PrestigeSkip2":false,"AutoEggs":false,"UseAutoGen":1,"AutoGen2":3,"AutoGen2End":320,"AutoGen2SupplyEnd":false,"AutoGen3":0,"AutoGenDC":1,"AutoGenC2":1,"AutoGen2Override":1,"SupplyWall":1,"OneTimeOnly":false,"BuyOvclock":false,"IgnoreSpiresUntil":500,"goldStrat":"Max then Helium","goldAlternating":2,"goldZone":600,"MaxStacksForSpire":true,"UsePatience":false,"AutoNatureTokens":true,"AutoPoison":"Empowerment","AutoWind":"Convert to Poison","AutoIce":"Convert to Poison","MaxMapBonusAfterZone":-1,"SpamGraphs":false,"allowSettingsUpload":false,"EnhanceGrids":false,"EnableAFK":{"id":"EnableAFK","name":"Enable AFK","description":"Enables CPU and RAM saving AFK-mode","type":"action","value":1},"SpamMagmite":false,"SpamPerks":true,"analyticsID":"7f11701e-adc9-477c-a08d-2b66fe3ec2a2","ChangeLog":{"id":"ChangeLog","name":"Show Changelog","description":"Shows the changelog popup message that AT loads on startup in case you missed it.","type":"action","value":1},"AdvMapSpecialModifier":false,"GeneticistTimer":-1,"goldNoBattle":true,"BuyUpgradesNew":1,"AutoFinishDailyNew":0,"BuyBuildingsNew":0,"BuyJobsNew":0,"BuyArmorNew":1,"BuyWeaponsNew":1,"PrestigeSkip1_2":0,"RunNewVoidsUntilNew":0,"DailyVoidMod":570,"PlusMapVoidToggle":0,"Praidingzone":[495,546,555,561,566,570],"BWraid":false,"BWraidingmin":-1,"BWraidingmax":[640],"lootdumpz":265,"lootdumpa":10000,"WindStackingMin":-1,"ScryUseinPoison":-1,"ScryUseinWind":-1,"ScryUseinIce":-1,"BuyOneTimeOC":2,"AutoHeirloomsNew":2,"ShowSettings":true,"BWraidingz":[597],"fastallocate":true,"VoidPraid":true,"trimpsnotdie":true,"gearamounttobuy":5,"Dailyportal":560,"dVoidPraid":true,"dPraidingzone":[495,510,525,540,555,570],"Dailybwraid":false,"dBWraidingz":[495],"dBWraidingmax":[515],"dExitSpireCell":-1,"WindStackingMax":190,"buyheliumy":-1,"buynojobsc":true,"Trimpicide":true,"fightforever":0,"use3daily":true,"windcutoff":-1,"spireshitbuy":true,"hardcorewind":-1,"PraidHarder":false,"PraidFarmFrags":false,"PraidBeforeFarm":false,"dPraidHarder":false,"dMaxPraidZone":[-1],"dPraidFarmFragsZ":[-1],"dPraidBeforeFarmZ":[-1],"MaxPraidZone":[505,535,545,555,561],"PraidFarmFragsZ":[495],"PraidBeforeFarmZ":[-1],"fuellater":260,"dWindStackingMin":450,"dWindStackingMax":190,"dwindcutoff":160,"dhardcorewind":480,"ScryerSkipHealthy":2,"addpoison":true,"amalcoord":true,"dAutoGoldenUpgrades":"Void 60","cAutoGoldenUpgrades":"Battle","dhardcorewindmax":"-1","cfightforever":true,"work":false,"in":false,"progress":false,"hardcorewindmax":"-1","dfightforever":2,"fuelend":320,"defaultgen":0,"spendmagmite":2,"spendmagmitesetting":1,"ultwind":-1,"ultwindcut":0.05,"CapEquiparm":100,"amalcoordhd":0.0000025,"onlyminmaxworld":false,"amalcoordz":398,"dultwind":"-1","dultwindcut":"0.00025","dwindhealthy":"false","windhealthy":false,"mapcutoff":4,"darmormagic":3,"carmormagic":3,"fuckanti":"-1","dscryvoidmaps":true,"scryvoidmaps":true,"dusebstance":true,"usebstance":true,"AutoPortalDaily":2,"dCustomAutoPortal":575,"dHeHrDontPortalBefore":"999","dHeliumHrBuffer":"0","dHeliumHourChallenge":"Corrupted","hidebuildings":true,"fuckjobs":true,"amalcoordt":6,"screwessence":false,"beforegen":0,"c2runnerstart":false,"c2runnerportal":"999","buywepsvoid":true,"mapc2hd":"-1","ScryerUseinBW":0,"dwindcutoffmap":160,"windcutoffmap":"-1"}';
}

function getPageSetting(setting) {
    if (autoTrimpSettings.hasOwnProperty(setting) == false) {
        return false;
    }
    if (autoTrimpSettings[setting].type == 'boolean') {
        return autoTrimpSettings[setting].enabled;
    } else if (autoTrimpSettings[setting].type == 'multiValue') {
        return Array.from(autoTrimpSettings[setting].value)
        .map(x => parseInt(x));
    } else if (autoTrimpSettings[setting].type == 'textValue') {
        return autoTrimpSettings[setting].value;
    } else if (autoTrimpSettings[setting].type == 'value' || autoTrimpSettings[setting].type == 'valueNegative') {
        return parseFloat(autoTrimpSettings[setting].value);
    } else if (autoTrimpSettings[setting].type == 'multitoggle') {
        return parseInt(autoTrimpSettings[setting].value);
    } else if (autoTrimpSettings[setting].type == 'dropdown') {
        return autoTrimpSettings[setting].selected;
    }
}

function setPageSetting(setting, value) {
    if (autoTrimpSettings.hasOwnProperty(setting) == false) {
        return false;
    }
    if (autoTrimpSettings[setting].type == 'boolean') {
        autoTrimpSettings[setting].enabled = value;
        document.getElementById(setting).setAttribute('class', 'noselect settingsBtn settingBtn' + autoTrimpSettings[setting].enabled);
    } else if (autoTrimpSettings[setting].type == 'value' || autoTrimpSettings[setting].type == 'valueNegative') {
        autoTrimpSettings[setting].value = value;
    } else if (autoTrimpSettings[setting].type == 'textValue') {
        autoTrimpSettings[setting].value = value;
    } else if (autoTrimpSettings[setting].type == 'multiValue' || autoTrimpSettings[setting].type == 'valueNegative') {
        autoTrimpSettings[setting].value = value;
    } else if (autoTrimpSettings[setting].type == 'multitoggle') {
        autoTrimpSettings[setting].value = value;
        document.getElementById(setting).setAttribute('class', 'noselect settingsBtn settingBtn' + autoTrimpSettings[setting].value);
    } else if (autoTrimpSettings[setting].type == 'dropdown') {
        autoTrimpSettings[setting].selected = value;
    }
}

function shouldSpeedRun(achievement) {
    //Returns false if we can't any new speed runs, unless it's the first tier
    var minutesThisRun = Math.floor((new Date().getTime() - game.global.portalTime) / 1000 / 60);
    if (achievement.finished == achievement.tiers.length) return false;
    return minutesThisRun < achievement.breakpoints[achievement.finished];
}

function saveSettings(){safeSetItems('autoTrimpSettings',serializeSettings())}
function debug(a,b,c){var d=getPageSetting('SpamGeneral'),e=getPageSetting('SpamUpgrades'),f=getPageSetting('SpamEquipment'),g=getPageSetting('SpamMaps'),h=getPageSetting('SpamOther'),i=getPageSetting('SpamBuilding'),j=getPageSetting('SpamJobs'),k=getPageSetting('SpamGraphs'),l=getPageSetting('SpamMagmite'),m=getPageSetting('SpamPerks'),n=getPageSetting('SpamProfiles'),o=getPageSetting('SpamNature'),p=!0;switch(b){case null:break;case'general':p=d;break;case'upgrades':p=e;break;case'equips':p=f;break;case'buildings':p=i;break;case'jobs':p=j;break;case'maps':p=g;break;case'other':p=h;break;case'graphs':p=k;break;case'magmite':p=l;break;case'perks':p=m;break;case'profiles':p=n;break;case'nature':p=o;}p&&(enableDebug&&console.log(timeStamp()+' '+a.replace('\&nbsp;', ' ')),message2(a,'AutoTrimps',c,b))}
function timeStamp(){for(var a=new Date,b=[a.getHours(),a.getMinutes(),a.getSeconds()],c=1;3>c;c++)10>b[c]&&(b[c]="0"+b[c]);return b.join(":")}
function preBuy(){preBuyAmt=game.global.buyAmt,preBuyFiring=game.global.firing,preBuyTooltip=game.global.lockTooltip,preBuymaxSplit=game.global.maxSplit}
function postBuy(){game.global.buyAmt=preBuyAmt,game.global.firing=preBuyFiring,game.global.lockTooltip=preBuyTooltip,game.global.maxSplit=preBuymaxSplit}
function preBuy2(){return[game.global.buyAmt,game.global.firing,game.global.lockTooltip,game.global.maxSplit]}
function postBuy2(a){game.global.buyAmt=a[0],game.global.firing=a[1],game.global.lockTooltip=a[2],game.global.maxSplit=a[3]}
function setTitle(){aWholeNewWorld&&(document.title='('+game.global.world+') Trimps '+document.getElementById('versionNumber').innerHTML)}
var lastmessagecount = 1;
function message2(a,b,c,d){var e=document.getElementById("log"),f=e.scrollTop+10>e.scrollHeight-e.clientHeight,g=ATmessageLogTabVisible?"block":"none",h="";c&&"*"==c.charAt(0)?(c=c.replace("*",""),h="icomoon icon-"):h="glyphicon glyphicon-",game.options.menu.timestamps.enabled&&(a=(1==game.options.menu.timestamps.enabled?getCurrentTime():updatePortalTimer(!0))+" "+a),c&&(a="<span class=\""+h+c+"\"></span> "+a),a="<span class=\"glyphicon glyphicon-superscript\"></span> "+a,a="<span class=\"icomoon icon-text-color\"></span>"+a;var i="<span class='"+b+"Message message "+d+"' style='display: "+g+"'>"+a+"</span>",j=document.getElementsByClassName(b+"Message");if(1<j.length&&-1<j[j.length-1].innerHTML.indexOf(a)){var k=j[j.length-1].innerHTML;lastmessagecount++;var l=k.lastIndexOf(" x");-1!=l&&(j[j.length-1].innerHTML=k.slice(0,l)),j[j.length-1].innerHTML+=" x"+lastmessagecount}else lastmessagecount=1,e.innerHTML+=i;f&&(e.scrollTop=e.scrollHeight),trimMessages(b)}
var ATbutton=document.createElement('button');ATbutton.innerHTML='AutoTrimps',ATbutton.setAttribute('id','AutoTrimpsFilter'),ATbutton.setAttribute('type','button'),ATbutton.setAttribute('onclick','filterMessage2(\'AutoTrimps\')'),ATbutton.setAttribute('class','btn btn-success logFlt');var tab=document.createElement('DIV');tab.setAttribute('class','btn-group'),tab.setAttribute('role','group'),tab.appendChild(ATbutton),document.getElementById('logBtnGroup').appendChild(tab);
function filterMessage2(a){var b=document.getElementById("log");displayed=!ATmessageLogTabVisible,ATmessageLogTabVisible=displayed;var c=document.getElementsByClassName(a+"Message"),d=displayed?a:a+" off",e=document.getElementById(a+"Filter");e.innerHTML=d,e.className="",e.className=getTabClass(displayed),displayed=displayed?"block":"none";for(var f=0;f<c.length;f++)c[f].style.display=displayed;b.scrollTop=b.scrollHeight}

function formatMinutesForDescriptions(number){
    var text;
    var seconds = Math.floor((number*60) % 60);
    var minutes = Math.floor(number % 60);
    var hours = Math.floor(number / 60);
    if (hours == 0)
        text = minutes + " minutes " + seconds + " seconds";
    else if (minutes > 0) {
        if (minutes < 10) minutes = "0" + minutes;
        if (seconds < 10) seconds = "0" + seconds;
        text = hours + ":" + minutes + ":" + seconds;
    }
    else {
        var hs = (hours > 1) ? "s" : "";
        var ms = (minutes > 1) ? "s" : "";
        var ss = (seconds > 1) ? "s" : "";
        text = hours + " hour" + hs + " " + minutes + " minute" + ms + " " + seconds + " second" + ss;
    }
    return text;
}

function ceilToNearestMultipleOf(number, multipleOf, offSet) {
    var n = number - offSet;
    var roundedUp = Math.ceil(n / multipleOf) * multipleOf
    return roundedUp + offSet
}

window.onerror=function(b,c,d,e,f){var g=['Message: '+b,'URL: '+c,'Line: '+d,'Column: '+e,'Error object: '+JSON.stringify(f)].join(' - ');0!=d&&console.log('AT logged error: '+g)};
function throwErrorfromModule(){throw new Error("We have successfully read the thrown error message out of a module")}


function generateUID() {
    // https://stackoverflow.com/questions/6248666/how-to-generate-short-uid-like-ax4j9z-in-js
    let firstPart = (Math.random() * 46656) | 0;
    let secondPart = (Math.random() * 46656) | 0;
    firstPart = ("000" + firstPart.toString(36)).slice(-3);
    secondPart = ("000" + secondPart.toString(36)).slice(-3);
    return firstPart + secondPart;
}

function devDebug(ctx, description, args, separator='=', singleLine=true) {
    // ctx: {
    //     id: null,     // if present, will be included before description, useful for grouping multiple log messages. use generateUID() to make it
    //     module: null, // if present, will be included before description, and it will be checked for the variable "devDebug" to enable logging
    // }
    // description: will be logged before the "args"
    // args: a Map-like collection of key-values, each pair will be logged using "separator"
    // separator: "args" will be joined using this string
    // singleLine: if false, each entry of "args" will be logged on its own line.
    //             if true, all "args" will be logged on a single line, comma-joined.
    //
    // Example:
    // devDebug(ctx={id: "1a2c3", module: "maps"}, description="Checking void maps", args={var1: 1, var2: "b"})
    // will log:
    // [AT] 13:10:00 [maps.1a2c3] Checking void maps
    // [AT] 13:10:00 [maps.1a2c3]     var1=1
    // [AT] 13:10:00 [maps.1a2c3]     var2=b
    //
    //Example 2:
    // devDebug({}, description="Checking void maps", args={var1: 1, var2: "b"}, separator=': ', singleLine=true)
    // will log:
    // [AT] 13:10:00 Checking void maps: var1: 1, var2: b
    //
    if (!args && !description) {
        // nothing to log
        return;
    }
    if (!getPageSetting('SpamDevDebug') && !(MODULES[ctx.module] && MODULES[ctx.module].devDebug)) {
        // logging is disabled
        return;
    }
    // compose [maps.1a2c3] or [1a2c3] or [maps] or ''
    ctx = [ctx.module, ctx.id].filter(m => m).join('.'); // remove empty values
    ctx = (ctx ? `[${ctx}]&nbsp;` : '');
    let prefix = `${ctx}${description}`;

    const argMessages = Object.entries(args || {}).map(([key, value]) => `${key}${separator}${value}`);
    if (singleLine) {
        prefix = (prefix ? `${prefix}: ` : '');
        debug(`${prefix}${argMessages.join(', ')}`);
    } else {
        let argPrefix;
        if (prefix) {
            debug(`${prefix}`);
            argPrefix = '&nbsp;&nbsp;&nbsp;&nbsp;';
        } else {
            argPrefix = '';
        }
        for (const msg of argMessages) {
            debug(`${ctx}${argPrefix}${msg}`);
        }
    }
}

function prettifyMap(map) {
    if (!map) {
        return 'none'
    }
    let descriptor;
    if (!map.noRecycle) {
        // a crafted map
        const bonus = (map.hasOwnProperty('bonus') ? mapSpecialModifierConfig[map.bonus].name : 'no bonus');
        descriptor = `, Level ${map.level} (${bonus})`;
    } else if (map.location === 'Void') {
        descriptor = ' (Void)';
    } else {
        descriptor = ' (Unique)';
    }
    return `[${map.id}] ${map.name}${descriptor} `;
}

function debugPrettifyMap(map) {
    if (!map) {
        return 'none'
    }
    let descriptor;
    if (!map.noRecycle) {
        // a crafted map
        const bonus = (map.hasOwnProperty('bonus') ? `+${map.bonus}` : '');
        descriptor = `L${map.level}${bonus}`;
    } else if (map.location === 'Void') {
        descriptor = `V(${map.name})`;
    } else {
        descriptor = `U(${map.name})`;
    }
    return `[${map.id}]${descriptor}`;
}