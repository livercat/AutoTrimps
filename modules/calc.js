var critCC = 1;
var critDD = 1;
var trimpAA = 1;

//Helium
function debugCalc() {
    //Pre-Init
    var type = (!game.global.mapsActive) ? "world" : (getCurrentMapObject().location == "Void" ? "void" : "map");
    var zone = (type == "world" || !game.global.mapsActive) ? game.global.world : getCurrentMapObject().level;
    var cell = (type == "world" || !game.global.mapsActive) ? getCurrentWorldCell().level : (getCurrentMapCell() ? getCurrentMapCell().level : 1);
    var name = getCurrentEnemy() ? getCurrentEnemy().name : "Chimp";

    //Init
    var displayedMin = calcOurDmg("min", false, true, type != "world", "never") * (game.global.titimpLeft > 0 ? 2 : 1);
    var displayedMax = calcOurDmg("max", false, true, type != "world", "never") * (game.global.titimpLeft > 0 ? 2 : 1);

    //Trimp Stats
    debug("Our Stats");
    debug("Our attack: " + displayedMin.toExponential(2) + "-" + displayedMax.toExponential(2));
    debug("Our crit: " + 100 * getPlayerCritChance() + "% for " + getPlayerCritDamageMult().toFixed(1) + "x Damage. Average of " + getCritMulti(false, "maybe").toFixed(2) + "x");
    debug("Our block: " + calcOurBlock(true, true).toExponential(2));
    debug("Our Health: " + calcOurHealth(true, false, true).toExponential(2));

    //Enemy stats
    debug("Enemy Stats");
    debug("Enemy Attack: " + calcEnemyAttack(type, zone, cell, name, true).toExponential(2) + "-" + calcEnemyAttack(type, zone, cell, name).toExponential(2));
    debug("Enemy Health: " + calcEnemyHealth(type, zone, cell, name).toExponential(2));
    debug("Specific Enemy Attack: " + calcSpecificEnemyAttack().toExponential(2));
    debug("Specific Enemy Health: " + calcSpecificEnemyHealth().toExponential(2));
}

function calcOurBlock(stance, realBlock) {
    var block = 0;

    //Ignores block gyms/shield that have been brought, but not yet deployed
    if (realBlock) {
        block = game.global.soldierCurrentBlock;
        if (stance || game.global.formation == 0) return block;
        if (game.global.formation == 3) return block/4;
        return block * 2;
    }

    //Gyms
    var gym = game.buildings.Gym;
    if (gym.owned > 0) block += gym.owned * gym.increase.by;

    //Shield Block
    var shield = game.equipment.Shield;
    if (shield.blockNow && shield.level > 0) block += shield.level * shield.blockCalculated;

    //Trainers
    var trainer = game.jobs.Trainer;
    if (trainer.owned > 0) {
        var trainerStrength = trainer.owned * (trainer.modifier / 100);
        block *= 1 + calcHeirloomBonus("Shield", "trainerEfficiency", trainerStrength);
    }

    //Coordination
    block *= game.resources.trimps.maxSoldiers;

    //Stances
    if (stance && game.global.formation != 0) block *= game.global.formation == 3 ? 4 : 0.5;

    //Heirloom
    var heirloomBonus = calcHeirloomBonus("Shield", "trimpBlock", 0, true);
    if (heirloomBonus > 0) block *= ((heirloomBonus / 100) + 1);

    return block;
}

function calcEquipment(type = "attack") {
    //Init
    var bonus = 0;
    var equipmentList;

    //Equipment names
    if (type == "attack") equipmentList = ["Dagger", "Mace", "Polearm", "Battleaxe", "Greatsword", "Arbalest"];
    else equipmentList = ["Shield", "Boots", "Helmet", "Pants", "Shoulderguards", "Breastplate", "Gambeson"];

    //For each equipment
    for(var i = 0; i < equipmentList.length; i++) {
        //Check if it's unlocked
        var equip = game.equipment[equipmentList[i]];
        if (equip.locked !== 0) continue;

        //Get the bonus
        bonus += equip.level * (type == "attack" ? equip.attackCalculated : equip.healthCalculated);
    }

    return bonus;
}

function getTrimpAttack(realDamage) {
    //This is actual damage of the army in combat ATM, without considering items bought, but not yet in use
    if (realDamage) return game.global.soldierCurrentAttack;

    //Damage from equipments and Coordinations
    var dmg = (6 + calcEquipment("attack")) * game.resources.trimps.maxSoldiers;

    //Magma
    if (mutations.Magma.active()) dmg *= mutations.Magma.getTrimpDecay();

    //Power I
    if (game.portal.Power.level > 0) dmg += (dmg * game.portal.Power.level * game.portal.Power.modifier);

    //Power II
    if (game.portal.Power_II.level > 0) dmg *= (1 + (game.portal.Power_II.modifier * game.portal.Power_II.level));

    //Formation
    if (game.global.formation != 0) dmg *= (game.global.formation == 2) ? 4 : 0.5;

    return dmg;
}

function getTrimpHealth(realHealth) {
    //This is the actual health of the army ATM, without considering items bought, but not yet in use
    if (realHealth) return game.global.soldierHealthMax;

    //Health from equipments and coordination
    var health = (50 + calcEquipment("health")) * game.resources.trimps.maxSoldiers;

    //Toughness
    if (game.portal.Toughness.level > 0)
        health *= 1 + game.portal.Toughness.level * game.portal.Toughness.modifier;

    //Toughness II
    if (game.portal.Toughness_II.level > 0)
        health *= 1 + game.portal.Toughness_II.level * game.portal.Toughness_II.modifier;

    //Resilience
    if (game.portal.Resilience.level > 0)
        health *= Math.pow(game.portal.Resilience.modifier + 1, game.portal.Resilience.level);

    //Geneticists
    var geneticist = game.jobs.Geneticist;
    if (geneticist.owned > 0) health *= Math.pow(1.01, game.global.lastLowGen);

    //Formation
    if (game.global.formation !== 0) health *= (game.global.formation == 1) ? 4 : 0.5;

    //Heirloom
    var heirloomBonus = calcHeirloomBonus("Shield", "trimpHealth", 0, true);
    if (heirloomBonus > 0) health *= 1 + heirloomBonus/100;

    //Golden Battle
    if (game.goldenUpgrades.Battle.currentBonus > 0) health *= 1 + game.goldenUpgrades.Battle.currentBonus;

    //C2
    if (game.global.totalSquaredReward > 0) health *= 1 + game.global.totalSquaredReward/100;

    return health;
}

function calcOurHealth(stance, fullGeneticist, realHealth) {
    var health = getTrimpHealth(realHealth);

    //Formation
    if (!stance && game.global.formation != 0) health /= (game.global.formation == 1) ? 4 : 0.5;

    //Geneticists
    var geneticist = game.jobs.Geneticist;
    if (fullGeneticist && geneticist.owned > 0) health *= Math.pow(1.01, geneticist.owned - game.global.lastLowGen);

    //Challenges
    if (game.global.challengeActive == "Life" && !realHealth) health *= game.challenges.Life.getHealthMult();
    else if (game.global.challengeActive == "Balance" && !realHealth) health *= game.challenges.Balance.getHealthMult();
    else if (typeof game.global.dailyChallenge.pressure !== 'undefined' && !realHealth)
        health *= dailyModifiers.pressure.getMult(game.global.dailyChallenge.pressure.strength, game.global.dailyChallenge.pressure.stacks);

    //Magma
    if (mutations.Magma.active() && !realHealth) health *= mutations.Magma.getTrimpDecay();

    //Amalgamator
    if (game.jobs.Amalgamator.owned > 0 && !realHealth) health *= game.jobs.Amalgamator.getHealthMult();

    //Void Power
    if (game.talents.voidPower.purchased && game.global.voidBuff && !realHealth) {
        var amt = (game.talents.voidPower2.purchased) ? ((game.talents.voidPower3.purchased) ? 65 : 35) : 15;
        health *= (1 + (amt / 100));
    }

    //Masteries
    if (game.talents.mapHealth.purchased && game.global.mapsActive && !realHealth) health *= 2;

    return health;
}

function calcHealthRatio(stance, fullGeneticist, type, targetZone, mapDifficulty = 1) {
    //Pre Init
    if (!type) type = preVoidCheck ? "void" : "world";
    if (!targetZone) targetZone = game.global.world;

    //Init
    var voidDamage = 0;
    const formationMod = (game.upgrades.Dominance.done && !stance) ? 2 : 1;

    //Our Health and Block
    var health = calcOurHealth(stance, fullGeneticist) / formationMod;
    var block = calcOurBlock(stance) / formationMod;

    //Calc for maps
    if (type == "map") return health / Math.max(mapDifficulty * calcEnemyAttack("map", targetZone) - block, 0);

    //Lead farms one zone ahead
    if (game.global.challengeActive == "Lead" && type == "world" && game.global.world%2 == 1) targetZone++;

    //Enemy Damage
    var worldDamage = calcEnemyAttack("world", targetZone);

    //Enemy Damage on Void Maps
    if (type == "void") {
        //Void Damage may actually be lower than world damage, so it needs to be calculated here to be compared later
        voidDamage = calcEnemyAttack("void", targetZone) - block;

        //Void Power compensation
        if (!game.global.mapsActive || getCurrentMapObject().location != "Void") {
            if      (game.talents.voidPower3.purchased) voidDamage /= 1.15;
            else if (game.talents.voidPower2.purchased) voidDamage /= 1.35;
            else if (game.talents.voidPower.purchased)  voidDamage /= 1.65;
        }

        //Map health compensation
        if (game.talents.mapHealth.purchased && type == "world") voidDamage /= 2;
    }

    //Pierce & Voids
    var pierce = (game.global.brokenPlanet) ? getPierceAmt() : 0;
    if (!stance && game.global.formation == 3) pierce *= 2; //Cancels the influence of the Barrier Formation

    //Cancel Map Health influence, even for void maps (they are set above)
    if (game.talents.mapHealth.purchased && game.global.mapsActive && type != "map") health /= 2;

    //The Resulting Ratio
    var finalDmg = Math.max(worldDamage - block, voidDamage, worldDamage * pierce, 0);
    return health / finalDmg;
}

function highDamageShield() {
    if (game.global.challengeActive != "Daily" && game.global.ShieldEquipped.name == getPageSetting("highdmg")) {
        critCC = getPlayerCritChance();
        critDD = getPlayerCritDamageMult();
        trimpAA = (calcHeirloomBonus("Shield", "trimpAttack", 1, true)/100);
    }
    if (game.global.challengeActive == "Daily" && game.global.ShieldEquipped.name == getPageSetting("dhighdmg")) {
        critCC = getPlayerCritChance();
        critDD = getPlayerCritDamageMult();
        trimpAA = (calcHeirloomBonus("Shield", "trimpAttack", 1, true)/100);
    }
}

function addPoison(realDamage, zone) {
    //Init
    if (!zone) zone = game.global.world;

    //Poison is inactive
    if (getEmpowerment(zone) != "Poison") return 0;

    //Real amount to be added in the next attack
    if (realDamage) return game.empowerments.Poison.getDamage();

    //Dynamically determines how much we are benefiting from poison based on Current Amount * Transfer Rate
    if (getPageSetting("addpoison")) return game.empowerments["Poison"].getDamage() * getRetainModifier("Poison");

    return 0;
}

//TODO - Very Important!
function newGetCritMulti(high) {

    var critChance = getPlayerCritChance();
    var CritD = getPlayerCritDamageMult();

    if (
        high &&
        (getPageSetting('AutoStance') == 3 && getPageSetting('highdmg') != undefined && game.global.challengeActive != "Daily") ||
        (getPageSetting('use3daily') == true && getPageSetting('dhighdmg') != undefined && game.global.challengeActive == "Daily")
    ) {
        highDamageShield();
        critChance = critCC;
        CritD = critDD;
    }

    var lowTierMulti = getMegaCritDamageMult(Math.floor(critChance));
    var highTierMulti = getMegaCritDamageMult(Math.ceil(critChance));
    var highTierChance = critChance - Math.floor(critChance)

    return ((1 - highTierChance) * lowTierMulti + highTierChance * highTierMulti) * CritD
}

function getCritMulti(high, crit) {
    var critChance = getPlayerCritChance();
    var critD = getPlayerCritDamageMult();
	var critDHModifier;

    if (crit == "never") critChance = Math.floor(critChance);
    else if (crit == "force") critChance = Math.ceil(critChance);

    if (high && (getPageSetting('AutoStance') == 3 && getPageSetting('highdmg') != undefined && game.global.challengeActive != "Daily") ||
        (getPageSetting('use3daily') == true && getPageSetting('dhighdmg') != undefined && game.global.challengeActive == "Daily")) {
            highDamageShield();
            critChance = critCC;
        critD = critDD;
    }

    if      (critChance < 0) critDHModifier = (1+critChance - critChance/5);
    else if (critChance < 1) critDHModifier = (1-critChance + critChance * critD);
    else if (critChance < 2) critDHModifier = ((critChance-1) * getMegaCritDamageMult(2) * critD + (2-critChance) * critD);
    else                     critDHModifier = ((critChance-2) * Math.pow(getMegaCritDamageMult(2),2) * critD + (3-critChance) * getMegaCritDamageMult(2) * critD);

    return critDHModifier;
}

function getAnticipationBonus(stacks) {
    //Pre-Init
    if (stacks == undefined) stacks = game.global.antiStacks;

    //Init
    var perkMult = game.portal.Anticipation.level * game.portal.Anticipation.modifier;
    var stacks45 = getPageSetting('45stacks') != false && getPageSetting('45stacks') != "false";

    //Regular anticipation
    if (!stacks45) return 1 + stacks * perkMult;

    //45 stacks (??)
    return 1 + 45 * perkMult;
}

function calcOurDmg(minMaxAvg = "avg", specificStance, realDamage, ignoreMapBonus, critMode) {
    //Init
    var number = getTrimpAttack(realDamage);
    var minFluct = 0.8;
    var maxFluct = 1.2;

    //Amalgamator
    if (game.jobs.Amalgamator.owned > 0) {
        number *= game.jobs.Amalgamator.getDamageMult();
    }

    //Map Bonus
    if (game.global.mapBonus > 0 && !ignoreMapBonus) {
        var mapBonus = game.global.mapBonus;
        if (game.talents.mapBattery.purchased && mapBonus == 10) mapBonus *= 2;
        number *= 1 + 0.2 * mapBonus;
    }

    //Range
    if (game.portal.Range.level > 0) minFluct += 0.02 * game.portal.Range.level;

    //Achievements
    if (game.global.achievementBonus > 0) number *= 1 + game.global.achievementBonus/100;

    //Anticipation
    if (game.global.antiStacks > 0) number *= getAnticipationBonus();

    //Formation
    if (specificStance && game.global.formation != 0) number /= (game.global.formation == 2) ? 4 : 0.5;
    if (specificStance && specificStance != "X") number *= (specificStance == "D") ? 4 : 0.5;

    //Robo Trimp
    if (game.global.roboTrimpLevel > 0) number *= 1 + 0.2 * game.global.roboTrimpLevel;

    //Heirlooms
    number = calcHeirloomBonus("Shield", "trimpAttack", number);

    //Fluffy
    if (Fluffy.isActive()) number *= Fluffy.getDamageModifier();

    //Gamma Burst - TODO
    //if (getHeirloomBonus("Shield", "gammaBurst") > 0 && calcOurHealth() / calcEnemyAttack() >= 5)
        //number *= ((getHeirloomBonus("Shield", "gammaBurst") / 100) + 1) / 5;

    //Challenges
    if (game.global.challengeActive == "Life") number *= game.challenges.Life.getHealthMult();
    if (game.global.challengeActive == "Lead" && (game.global.world % 2) == 1) number *= 1.5;
    if (game.challenges.Electricity.stacks > 0) {
        var stacks = game.challenges.Electricity.stacks;
        if (!realDamage && minMaxAvg.toLowerCase() == "min") stacks = 0;
        if (!realDamage && minMaxAvg.toLowerCase() == "avg") stacks /= 2;
        number *= 1 - (stacks * 0.1);
    }

    //Decay
    if (game.global.challengeActive == "Decay") {
        number *= 5;
        number *= Math.pow(0.995, game.challenges.Decay.stacks);
    }

    //Discipline
    if (game.global.challengeActive == "Discipline") {
        minFluct = 0.005;
        maxFluct = 1.995;
    }

    //Daily
    if (game.global.challengeActive == "Daily") {
        //Range Dailies
        if (typeof game.global.dailyChallenge.minDamage !== "undefined") minFluct = dailyModifiers.minDamage.getMult(game.global.dailyChallenge.minDamage.strength);
        if (typeof game.global.dailyChallenge.maxDamage !== "undefined") maxFluct = dailyModifiers.maxDamage.getMult(game.global.dailyChallenge.maxDamage.strength);

	    //Even-Odd Dailies
        if (typeof game.global.dailyChallenge.oddTrimpNerf !== "undefined" && ((game.global.world % 2) == 1))
            number *= dailyModifiers.oddTrimpNerf.getMult(game.global.dailyChallenge.oddTrimpNerf.strength);
        if (typeof game.global.dailyChallenge.evenTrimpBuff !== "undefined" && ((game.global.world % 2) == 0))
            number *= dailyModifiers.evenTrimpBuff.getMult(game.global.dailyChallenge.evenTrimpBuff.strength);

        //Rampage Dailies
        if (typeof game.global.dailyChallenge.rampage !== "undefined")
            number *= dailyModifiers.rampage.getMult(game.global.dailyChallenge.rampage.strength, game.global.dailyChallenge.rampage.stacks);

        //Weakness
        if (typeof game.global.dailyChallenge.weakness !== "undefined")
            number *= dailyModifiers.weakness.getMult(game.global.dailyChallenge.weakness.strength, game.global.dailyChallenge.weakness.stacks);
    }

    //Battle Goldens
    if (game.goldenUpgrades.Battle.currentBonus > 0) number *= game.goldenUpgrades.Battle.currentBonus + 1;

    //Masteries - Herbalist, Legs for Days, Magmamancer, Still Rowing II, Void Mastery, Health Strength, Sugar Rush
    if (game.talents.herbalist.purchased) number *= game.talents.herbalist.getBonus();
    if (game.global.challengeActive == "Daily" && game.talents.daily.purchased) number *= 1.5;
    if (game.talents.magmamancer.purchased) number *= game.jobs.Magmamancer.getBonusPercent();
    if (game.talents.stillRowing2.purchased) number *= ((game.global.spireRows * 0.06) + 1);
    if (game.global.voidBuff && game.talents.voidMastery.purchased) number *= 5;
    if (game.talents.healthStrength.purchased && mutations.Healthy.active()) number *= ((0.15 * mutations.Healthy.cellCount()) + 1);
    if (game.global.sugarRush > 0) number *= sugarRush.getAttackStrength();

    //Void Power
    if (game.talents.voidPower.purchased && game.global.voidBuff) {
        var vpAmt = (game.talents.voidPower2.purchased) ? ((game.talents.voidPower3.purchased) ? 65 : 35) : 15;
        number *= ((vpAmt / 100) + 1);
    }

    //Scryhard
    var fightingCorrupted = getCurrentEnemy() && getCurrentEnemy().corrupted || !realDamage && (mutations.Healthy.active() || mutations.Corruption.active());
    if (game.talents.scry.purchased && fightingCorrupted && !specificStance && game.global.formation == 4)
        number *= 2;

    //Spire Strength Trap
    if (playerSpireTraps.Strength.owned) {
        var strBonus = playerSpireTraps.Strength.getWorldBonus();
        number *= (1 + (strBonus / 100));
    }

    //Fluffy + Sharp Trimps + Uber Poison + Challenge²
    if (Fluffy.isRewardActive('voidSiphon') && game.stats.totalVoidMaps.value) number *= (1 + (game.stats.totalVoidMaps.value * 0.05));
    if (game.singleRunBonuses.sharpTrimps.owned) number *= 1.5;
    if (game.global.uberNature == "Poison") number *= 3;
    if (game.global.totalSquaredReward > 0) number *= ((game.global.totalSquaredReward / 100) + 1);

    //Init Damage Variation (Crit)
    var min = number * getCritMulti(false, (critMode) ? critMode : "never");
    var avg = number * getCritMulti(false, (critMode) ? critMode : "maybe");
    var max = number * getCritMulti(false, (critMode) ? critMode : "force");

    //Empowerments - Ice (Experimental)
    if (getEmpowerment() == "Ice") {
        //Uses the actual number in some places like Stances
        if (!getPageSetting('fullice') || realDamage) number *= 1 + game.empowerments.Ice.getDamageModifier();

        //Otherwise, use the number we would have after a transfer
        else {
            var afterTransfer = 1 + Math.ceil(game.empowerments["Ice"].currentDebuffPower * getRetainModifier("Ice"));
            var mod = 1 - Math.pow(game.empowerments.Ice.getModifier(), afterTransfer);
            if (Fluffy.isRewardActive('naturesWrath')) mod *= 2;
            number *= 1 + mod;
        }
    }

    //Empowerments - Poison (Old One)
    /*if (getEmpowerment() == "Poison" && getPageSetting('addpoison') == true) {
        number *= (1 + game.empowerments.Poison.getModifier());
        number *= getMapCutOff();
    }*/

    //Damage Fluctuation
    min *= minFluct;
    max *= maxFluct;
    avg *= (maxFluct + minFluct)/2;


    //Well, finally, huh?
    if (minMaxAvg == "min") return Math.floor(min);
    if (minMaxAvg == "max") return Math.ceil(max);

    return avg;
}

function calcSpire(what, cell, name) {
    //Target Cell
    if (!cell) {
        if (isActiveSpireAT() && getPageSetting('ExitSpireCell') > 0 && getPageSetting('ExitSpireCell') <= 100)
            cell = getPageSetting('ExitSpireCell');
        else if (disActiveSpireAT() && getPageSetting('dExitSpireCell') > 0 && getPageSetting('dExitSpireCell') <= 100)
            cell = getPageSetting('dExitSpireCell');
        else cell = 100;
    }

    //Enemy on the Target Cell
    var enemy = (name) ? name : game.global.gridArray[cell-1].name;
    var base = (what == "attack") ? calcEnemyBaseAttack("world", game.global.world, cell, enemy) : 2 * calcEnemyBaseHealth("world", game.global.world, cell, enemy);
    var mod = (what == "attack") ? 1.17 : 1.14;

    //Spire Num
    var spireNum = Math.floor((game.global.world-100)/100);
    if (spireNum > 1) {
        var modRaiser = 0;
        modRaiser += ((spireNum - 1) / 100);
        if (what == "attack") modRaiser *= 8;
        if (what == "health") modRaiser *= 2;
        mod += modRaiser;
    }

    //Math
    base *= Math.pow(mod, cell);

    //Compensations for Domination
    if (game.global.challengeActive == "Domination" && cell != 100) base /= (what == "attack") ? 25 : 75;

    return base;
}

function badGuyChallengeMult() {
    var number=1;

    //WARNING! Something is afoot!
    //A few challenges
    if      (game.global.challengeActive == "Meditate")   number *= 1.5;
    else if (game.global.challengeActive == "Crushed")    number *= 3;
    else if (game.global.challengeActive == "Watch")      number *= 1.25;
    else if (game.global.challengeActive == "Corrupted")  number *= 3;
    else if (game.global.challengeActive == "Domination") number *= 2.5;
    else if (game.global.challengeActive == "Coordinate") number *= getBadCoordLevel();
    else if (game.global.challengeActive == "Scientist" && getScientistLevel() == 5) number *= 10;

    //Obliterated and Eradicated
    else if (game.global.challengeActive == "Obliterated" || game.global.challengeActive == "Eradicated"){
        var oblitMult = (game.global.challengeActive == "Eradicated") ? game.challenges.Eradicated.scaleModifier : 1e12;
        var zoneModifier = Math.floor(game.global.world / game.challenges[game.global.challengeActive].zoneScaleFreq);
        oblitMult *= Math.pow(game.challenges[game.global.challengeActive].zoneScaling, zoneModifier);
        number *= oblitMult
    }

    return number;
}

function badGuyCritMult(enemy, critPower=2, block, health) {
    //Pre-Init
    if (getPageSetting('IgnoreCrits') == 2) return 1;
    if (!enemy) enemy = getCurrentEnemy();
    if (!enemy || critPower <= 0) return 1;
    if (!block) block = game.global.soldierCurrentBlock;
    if (!health) health = game.global.soldierHealth;

    //Init
    var regular=1, challenge=1;

    //Non-challenge crits
    if      (enemy.corrupted == 'corruptCrit') regular = 5;
    else if (enemy.corrupted == 'healthyCrit') regular = 7;
    else if (game.global.voidBuff == 'getCrit' && getPageSetting('IgnoreCrits') != 1) regular = 5;

    //Challenge crits
    var crushed = game.global.challengeActive == "Crushed";
    var critDaily = game.global.challengeActive == "Daily" && typeof game.global.dailyChallenge.crits !== 'undefined';

    //Challenge multiplier
    if (critDaily) challenge = dailyModifiers.crits.getMult(game.global.dailyChallenge.crits.strength);
    else if (crushed && health > block) challenge = 5;

    //Result -- Yep. Crits may crit! Yey!
    if (critPower == 2) return regular * challenge;
    else return Math.max(regular, challenge);
}

function calcCorruptionScale(zone, base) {
    var startPoint = (game.global.challengeActive == "Corrupted" || game.global.challengeActive == "Eradicated") ? 1 : 150;
    var scales = Math.floor((zone - startPoint) / 6);
    var realValue = base * Math.pow(1.05, scales);
    return parseFloat(prettify(realValue));
}

function calcEnemyBaseAttack(type, zone, cell, name) {
    //Pre-Init
    if (!type) type = (!game.global.mapsActive) ? "world" : (getCurrentMapObject().location == "Void" ? "void" : "map");
    if (!zone) zone = (type == "world" || !game.global.mapsActive) ? game.global.world : getCurrentMapObject().level;
    if (!cell) cell = (type == "world" || !game.global.mapsActive) ? getCurrentWorldCell().level : (getCurrentMapCell() ? getCurrentMapCell().level : 1);
    if (!name) name = getCurrentEnemy() ? getCurrentEnemy().name : "Snimp";

    //Init
    var attack = 50 * Math.sqrt(zone) * Math.pow(3.27, zone/2) - 10;

    //Zone 1
    if (zone == 1) {
        attack *= 0.35;
        attack = (0.2 * attack) + (0.75 * attack * (cell / 100));
    }

    //Zone 2
    else if (zone == 2) {
        attack *= 0.5;
        attack = (0.32 * attack) + (0.68 * attack * (cell / 100));
    }

    //Before Breaking the Planet
    else if (zone < 60) {
        attack = (0.375 * attack) + (0.7 * attack * (cell / 100));
        attack *= 0.85;
    }

    //After Breaking the Planet
    else {
        attack = (0.4 * attack) + (0.9 * attack * (cell / 100));
        attack *= Math.pow(1.15, zone - 59);
    }

    //Maps
    if (zone > 5 && type != "world") attack *= 1.1;

    //Specific Imp
    if (name) attack *= game.badGuys[name].attack;

    return Math.floor(attack);
}

function calcEnemyAttackCore(type, zone, cell, name, minOrMax, customAttack) {
    //Pre-Init
    if (!type) type = (!game.global.mapsActive) ? "world" : (getCurrentMapObject().location == "Void" ? "void" : "map");
    if (!zone) zone = (type == "world" || !game.global.mapsActive) ? game.global.world : getCurrentMapObject().level;
    if (!cell) cell = (type == "world" || !game.global.mapsActive) ? getCurrentWorldCell().level : (getCurrentMapCell() ? getCurrentMapCell().level : 1);
    if (!name) name = getCurrentEnemy() ? getCurrentEnemy().name : "Snimp";

    //Init
    var attack = calcEnemyBaseAttack(type, zone, cell, name);

    //Spire - Overrides the base attack number
    if (type == "world" && game.global.spireActive) attack = calcSpire("attack");

    //Map and Void Corruption
    if (type != "world") {
        //Corruption
        var corruptionScale = calcCorruptionScale(game.global.world, 3);
        if (mutations.Magma.active()) attack *= corruptionScale / (type == "void" ? 1 : 2);
        else if (type == "void" && mutations.Corruption.active()) attack *= corruptionScale / 2;
    }

    //Use custom values instead
    if (customAttack) attack = customAttack;

    //WARNING! Check every challenge!
    //A few challenges
    if      (game.global.challengeActive == "Meditate")   attack *= 1.5;
    else if (game.global.challengeActive == "Watch")      attack *= 1.25;
    else if (game.global.challengeActive == "Corrupted")  attack *= 3;
    else if (game.global.challengeActive == "Scientist" && getScientistLevel() == 5) attack *= 10;

    //Coordinate
    if (game.global.challengeActive == "Coordinate") {
        var amt = 1;
        for (var i=1; i<zone; i++) amt = Math.ceil(amt * 1.25);
        attack *= amt;
    }

    //Dailies
    if (game.global.challengeActive == "Daily") {
        //Bad Strength
        if (typeof game.global.dailyChallenge.badStrength !== "undefined")
            attack *= dailyModifiers.badStrength.getMult(game.global.dailyChallenge.badStrength.strength);

        //Bad Map Strength
        if (typeof game.global.dailyChallenge.badMapStrength !== "undefined" && type != "world")
            attack *= dailyModifiers.badMapStrength.getMult(game.global.dailyChallenge.badMapStrength.strength);

        //Bloodthirsty
        if (typeof game.global.dailyChallenge.bloodthirst !== 'undefined')
            attack *= dailyModifiers.bloodthirst.getMult(game.global.dailyChallenge.bloodthirst.strength, game.global.dailyChallenge.bloodthirst.stacks);

        //Empower
        if (typeof game.global.dailyChallenge.empower !== "undefined")
            attack *= dailyModifiers.empower.getMult(game.global.dailyChallenge.empower.strength, game.global.dailyChallenge.empower.stacks);
    }

    //Obliterated and Eradicated
    else if (game.global.challengeActive == "Obliterated" || game.global.challengeActive == "Eradicated") {
        var oblitMult = (game.global.challengeActive == "Eradicated") ? game.challenges.Eradicated.scaleModifier : 1e12;
        var zoneModifier = Math.floor(game.global.world / game.challenges[game.global.challengeActive].zoneScaleFreq);
        oblitMult *= Math.pow(game.challenges[game.global.challengeActive].zoneScaling, zoneModifier);
        attack *= oblitMult;
    }

    return minOrMax ? 0.8 * attack : 1.2 * attack;
}

function calcEnemyAttack(type, zone, cell = 99, name = "Snimp", minOrMax) {
    //Pre-Init
    if (!type) type = preVoidCheck ? "void" : "world";
    if (!zone) zone = game.global.world;

    //Init
    var attack = calcEnemyAttackCore(type, zone, cell, name, minOrMax);
    var corrupt = zone >= mutations.Corruption.start();
    var healthy = mutations.Healthy.active();

    //Challenges
    if      (game.global.challengeActive == "Balance")    attack *= (type == "world") ? 1.17 : 2.35;
    else if (game.global.challengeActive == "Life")       attack *= 6;
    else if (game.global.challengeActive == "Crushed")    attack *= 3;
    else if (game.global.challengeActive == "Toxicity")   attack *= 5;
    else if (game.global.challengeActive == "Lead")       attack *= (zone%2 == 0) ? 5.08 : (1 + 0.04 * game.challenges.Lead.stacks);
    else if (game.global.challengeActive == "Domination") attack *= 2.5;

    //Dailies
    else if (game.global.challengeActive == "Daily") {
        //Crits
        if (typeof game.global.dailyChallenge.crits !== "undefined")
            attack *= 0.75 + 0.25 * dailyModifiers.crits.getMult(game.global.dailyChallenge.crits.strength);
    }

    //Void Map Difficulty (implicit 100% difficulty on regular maps)
    if (type == "void") attack *= (zone >= 60) ? 4.5 : 2.5;

    //Average corrupt impact on World times two - this is to compensate a bit for Corrupted buffs. Improbabilities count as 5.
    if (type == "world" && corrupt && !game.global.spireActive) {
        //Corruption during Domination
        if (game.global.challengeActive == "Domination") attack *= calcCorruptionScale(zone, 3);

        //Calculates the impact of the corruption on the average attack on that map. Improbabilities count as 5.
        else {
            //It uses the average times two for damage because otherwise trimps would be full pop half of the time, but dead in the other half
            var corruptionAmount = 2 * Math.min(52, 7 + ~~((zone - mutations.Corruption.start()) / 3)); //Integer division
            var corruptionWeight = (104 - corruptionAmount) + corruptionAmount * calcCorruptionScale(zone, 3);
            attack *= corruptionWeight / 104;
        }
    }

    //Healthy
    if (type == "world" && healthy && !game.global.spireActive) {
        //Calculates the impact of the Healthy on the average attack on that map.
        var healthyAmount = 2 * Math.min(50, 2 + ~~((zone - 300) / 15)); //Integer division
        var healthyWeight = (100 - healthyAmount) + healthyAmount * calcCorruptionScale(zone, 5) / calcCorruptionScale(zone, 3);
        attack *= healthyWeight / 100;
    }

    //Ice - Experimental
    if (getEmpowerment() == "Ice" && getPageSetting('fullice') == true) {
        var afterTransfer = 1 + Math.ceil(game.empowerments["Ice"].currentDebuffPower * getRetainModifier("Ice"));
        attack *= Math.pow(game.empowerments.Ice.getModifier(), afterTransfer);
    }

    return minOrMax ? Math.floor(attack) : Math.ceil(attack);
}

function calcSpecificEnemyAttack(critPower=2, customBlock, customHealth) {
    //Init
    var enemy = getCurrentEnemy();
    if (!enemy) return 1;

    //Init
    var attack  = calcEnemyAttackCore(undefined, undefined, undefined, undefined, undefined, enemy.attack);
        attack *= badGuyCritMult(enemy, critPower, customBlock, customHealth);

    //Challenges - considers the actual scenario for this enemy
    if (game.global.challengeActive == "Nom" && typeof enemy.nomStacks !== 'undefined') attack *= Math.pow(1.25, enemy.nomStacks)
    if (game.global.challengeActive == "Lead") attack *= 1 + (0.04 * game.challenges.Lead.stacks);

    //Magneto Shriek
    if (game.global.usingShriek) attack *= game.mapUnlocks.roboTrimp.getShriekValue();

    //Ice
    if (getEmpowerment() == "Ice") attack *= game.empowerments.Ice.getCombatModifier();

    return Math.ceil(attack);
}

function calcEnemyBaseHealth(type, zone, cell, name) {
    //Pre-Init
    if (!type) type = (!game.global.mapsActive) ? "world" : (getCurrentMapObject().location == "Void" ? "void" : "map");
    if (!zone) zone = (type == "world" || !game.global.mapsActive) ? game.global.world : getCurrentMapObject().level;
    if (!cell) cell = (type == "world" || !game.global.mapsActive) ? getCurrentWorldCell().level : (getCurrentMapCell() ? getCurrentMapCell().level : 1);
    if (!name) name = getCurrentEnemy() ? getCurrentEnemy().name : "Turtlimp";

    //Init
    var base = (game.global.universe == 2) ? 10e7 : 130;
    var health = base * Math.sqrt(zone) * Math.pow(3.265, zone / 2) - 110;

    //First Two Zones
    if (zone == 1 || zone == 2 && cell < 10) {
        health *= 0.6;
        health = (health * 0.25) + ((health * 0.72) * (cell / 100));
    }

    //Before Breaking the Planet
    else if (zone < 60) {
        health = (health * 0.4) + ((health * 0.4) * (cell / 110));
        health *= 0.75;
    }

    //After Breaking the Planet
    else {
        health = (health * 0.5) + ((health * 0.8) * (cell / 100));
        health *= Math.pow(1.1, zone - 59);
    }

    //Maps
    if (zone > 5 && type != "world") health *= 1.1;

    //Specific Imp
    if (name) health *= game.badGuys[name].health;

    return Math.floor(health);
}

function calcEnemyHealthCore(type, zone, cell, name, customHealth) {
    //Pre-Init
    if (!type) type = (!game.global.mapsActive) ? "world" : (getCurrentMapObject().location == "Void" ? "void" : "map");
    if (!zone) zone = (type == "world" || !game.global.mapsActive) ? game.global.world : getCurrentMapObject().level;
    if (!cell) cell = (type == "world" || !game.global.mapsActive) ? getCurrentWorldCell().level : (getCurrentMapCell() ? getCurrentMapCell().level : 1);
    if (!name) name = getCurrentEnemy() ? getCurrentEnemy().name : "Turtlimp";

    //Init
    var health = calcEnemyBaseHealth(type, zone, cell, name);

    //Spire - Overrides the base health number
    if (type == "world" && game.global.spireActive) health = calcSpire("health");

    //Map and Void Corruption
    if (type != "world") {
        //Corruption
        var corruptionScale = calcCorruptionScale(game.global.world, 10);
        if (mutations.Magma.active()) health *= corruptionScale / (type == "void" ? 1 : 2);
        else if (type == "void" && mutations.Corruption.active()) health *= corruptionScale / 2;
    }

    //Use a custom value instead
    if (customHealth) health = customHealth;

    //Challenges
    if (game.global.challengeActive == "Balance")    health *= 2;
    if (game.global.challengeActive == "Meditate")   health *= 2;
    if (game.global.challengeActive == "Toxicity")   health *= 2;
    if (game.global.challengeActive == "Life")       health *= 11;

    //Coordinate
    if (game.global.challengeActive == "Coordinate") {
        var amt = 1;
        for (var i=1; i<zone; i++) amt = Math.ceil(amt * 1.25);
        health *= amt;
    }

    //Dailies
    if (game.global.challengeActive == "Daily") {
        //Empower
        if (typeof game.global.dailyChallenge.empower !== "undefined")
            health *= dailyModifiers.empower.getMult(game.global.dailyChallenge.empower.strength, game.global.dailyChallenge.empower.stacks)

        //Bad Health
        if (typeof game.global.dailyChallenge.badHealth !== "undefined")
            health *= dailyModifiers.badHealth.getMult(game.global.dailyChallenge.badHealth.strength);

        //Bad Map Health
        if (typeof game.global.dailyChallenge.badMapHealth !== "undefined" && type != "world")
            health *= dailyModifiers.badMapHealth.getMult(game.global.dailyChallenge.badMapHealth.strength);
    }

    //Obliterated + Eradicated
    if (game.global.challengeActive == "Obliterated" || game.global.challengeActive == "Eradicated") {
        var oblitMult = (game.global.challengeActive == "Eradicated") ? game.challenges.Eradicated.scaleModifier : 1e12;
        var zoneModifier = Math.floor(game.global.world / game.challenges[game.global.challengeActive].zoneScaleFreq);
        oblitMult *= Math.pow(game.challenges[game.global.challengeActive].zoneScaling, zoneModifier);
        health *= oblitMult;
    }

    return health;
}

function calcEnemyHealth(type, zone, cell = 99, name = "Turtlimp") {
    //Pre-Init
    if (!type) type = preVoidCheck ? "void" : "world";
    if (!zone) zone = game.global.world;

    //Init
    var health = calcEnemyHealthCore(type, zone, cell, name);
    var corrupt = zone >= mutations.Corruption.start();
    var healthy = mutations.Healthy.active();

    //Challenges - worst case for Lead and Domination
    if (game.global.challengeActive == "Domination") health *= 7.5;
    if (game.global.challengeActive == "Lead") health *= (zone%2 == 0) ? 5.08 : (1 + 0.04 * game.challenges.Lead.stacks);

    //Void Map Difficulty (implicit 100% difficulty on regular maps)
    if (type == "void") health *= (zone >= 60) ? 4.5 : 2.5;

    //Average corrupt impact on World
    if (type == "world" && corrupt && !game.global.spireActive) {
        //Corruption during Domination
        if (game.global.challengeActive == "Domination") health *= calcCorruptionScale(zone, 10);

        //Calculates the impact of the corruption on the average health on that map times two. Improbabilities count as 5.
        else {
            var corruptionAmount = 2 * Math.min(52, 7 + ~~((zone - mutations.Corruption.start()) / 3)); //Integer division
            var corruptionWeight = (104 - corruptionAmount) + corruptionAmount * calcCorruptionScale(zone, 10);
            health *= corruptionWeight/104;
        }
    }

    //Healthy
    if (type == "world" && healthy && !game.global.spireActive) {
        //Calculates the impact of the Healthy on the average attack on that map.
        var healthyAmount = 2 * Math.min(50, 2 + ~~((zone - 300) / 15)); //Integer division
        var healthyWeight = (100 - healthyAmount) + healthyAmount * calcCorruptionScale(zone, 14) / calcCorruptionScale(zone, 10);
        health *= healthyWeight / 100;
    }

    return health;
}

function calcSpecificEnemyHealth(type, zone, cell, forcedName) {
    //Pre-Init
    if (!type) type = (!game.global.mapsActive) ? "world" : (getCurrentMapObject().location == "Void" ? "void" : "map");
    if (!zone) zone = (type == "world" || !game.global.mapsActive) ? game.global.world : getCurrentMapObject().level;
    if (!cell) cell = (type == "world" || !game.global.mapsActive) ? getCurrentWorldCell().level : (getCurrentMapCell() ? getCurrentMapCell().level : 1);

    //Select our enemy
    var enemy = (type == "world") ? game.global.gridArray[cell-1] : game.global.mapGridArray[cell-1];
    if (!enemy) return -1;

    //Init
    var corrupt = enemy.corrupted && enemy.corrupted != "none";
    var healthy = corrupt && enemy.corrupted.startsWith("healthy");
    var name = corrupt ? "Chimp" : (forcedName) ? forcedName : enemy.name;
    var health = calcEnemyHealthCore(type, zone, cell, name);

    //Challenges - considers the actual scenario for this enemy
    if (game.global.challengeActive == "Lead") health *= 1 + (0.04 * game.challenges.Lead.stacks);
    if (game.global.challengeActive == "Domination") {
        var lastCell = (type == "world") ? 100 : game.global.mapGridArray.length;
        if (cell < lastCell) health /= 10;
        else health *= 7.5;
    }

    //Map and Void Difficulty
    if (type != "world") health *= getCurrentMapObject().difficulty;

    //Corruption
    else if (type == "world" && !healthy && (corrupt || mutations.Corruption.active() && cell == 100) && !game.global.spireActive) {
        health *= calcCorruptionScale(zone, 10);
        if (enemy.corrupted == "corruptTough") health *= 5;
    }

    //Healthy
    else if (type == "world" && healthy) {
        health *= calcCorruptionScale(zone, 14);
        if (enemy.corrupted == "healthyTough") health *= 7.5;
    }

    return health;
}

function calcHDRatio(targetZone, type) {
    //Pre-Init
    if (!targetZone) targetZone = game.global.world;
    if (!type) type = preVoidCheck ? "void" : "world";

    //Init
    var ignoreMapBonus = type != "world" || (game.global.challengeActive == "Lead" && targetZone%2 == 1);
    var ourBaseDamage = calcOurDmg("avg", "X", false, ignoreMapBonus);

    //Shield
    highDamageShield();
    if (getPageSetting('AutoStance') == 3 && getPageSetting('highdmg') != undefined && game.global.challengeActive != "Daily" && game.global.ShieldEquipped.name != getPageSetting('highdmg')) {
        ourBaseDamage /= getCritMulti(false);
        ourBaseDamage *= trimpAA;
        ourBaseDamage *= getCritMulti(true);
    }
    if (getPageSetting('use3daily') == true && getPageSetting('dhighdmg') != undefined && game.global.challengeActive == "Daily" && game.global.ShieldEquipped.name != getPageSetting('dhighdmg')) {
        ourBaseDamage /= getCritMulti(false);
        ourBaseDamage *= trimpAA;
        ourBaseDamage *= getCritMulti(true);
    }

    //Void Power compensation
    if (type == "void" && !(game.global.mapsActive && getCurrentMapObject().location != "Void")) {
        if      (game.talents.voidPower3.purchased) ourBaseDamage *= 1.15;
        else if (game.talents.voidPower2.purchased) ourBaseDamage *= 1.35;
        else if (game.talents.voidPower.purchased)  ourBaseDamage *= 1.65;
    }
    if (type === 'map' && (game.unlocks.imps.Titimp)) {
        ourBaseDamage *= 2;
    }

    //Lead Challenge
    if (game.global.challengeActive == "Lead" && targetZone%2 == 1 && type != "map") {
        //Stats for void maps
        var voidDamage = ourBaseDamage;
        var voidHealth = type == "void" ? calcEnemyHealth("void", targetZone) : 0;

        //Farms on odd zones, and ignores the odd zone attack buff
        targetZone++;
        ourBaseDamage /= 1.5;

        //Custom Anticipation Stacks
        var anti = (mutations.Corruption.active()) ? (scryingCorruption() ? 5 : 10) : 19;
        if (game.global.antiStacks > anti) {
            ourBaseDamage /= getAnticipationBonus(game.global.antiStacks);
            ourBaseDamage *= getAnticipationBonus(anti);
        }

        //Empowerments - Poison
        ourBaseDamage += addPoison(false, targetZone);
        voidDamage += addPoison();

        //Return whatever gives the worst H:D ratio, an odd zone void map or farming for the next even zone
        return Math.max(voidHealth / voidDamage, calcEnemyHealth("world", targetZone) / ourBaseDamage);
    }

    //Return H:D for a regular, sane, not f-ing Lead zone (sorry, Lead just took a lot of me)
    return calcEnemyHealth(type, targetZone) / (ourBaseDamage + addPoison());
}

function calcCurrentStance() {
    if (game.global.uberNature == "Wind" && getEmpowerment() == "Wind" && !game.global.mapsActive &&
        (((game.global.challengeActive != "Daily" && calcHDRatio() < getPageSetting('WindStackingMinHD'))
            || (game.global.challengeActive == "Daily" && calcHDRatio() < getPageSetting('dWindStackingMinHD')))
                && ((game.global.challengeActive != "Daily" && game.global.world >= getPageSetting('WindStackingMin'))
                    || (game.global.challengeActive == "Daily" && game.global.world >= getPageSetting('dWindStackingMin'))))
                        || (game.global.uberNature == "Wind" && getEmpowerment() == "Wind" && !game.global.mapsActive && checkIfLiquidZone() && getPageSetting('liqstack') == true))
                            return 15;
    else {
        //Base Calc
        var eHealth = 1;
        if (game.global.fighting) eHealth = (getCurrentEnemy().maxHealth - getCurrentEnemy().health);
        var attackLow = calcOurDmg("max", "X");
        var attackHigh = calcOurDmg("max", "X");

        //Heirloom Calc
        highDamageShield();
        if (getPageSetting('AutoStance') == 3 && getPageSetting('highdmg') != undefined && game.global.challengeActive != "Daily" && game.global.ShieldEquipped.name != getPageSetting('highdmg')) {
            attackHigh *= trimpAA;
            attackHigh *= getCritMulti(true);
        }
        if (getPageSetting('use3daily') == true && getPageSetting('dhighdmg') != undefined && game.global.challengeActive == "Daily" && game.global.ShieldEquipped.name != getPageSetting('dhighdmg')) {
            attackHigh *= trimpAA;
            attackHigh *= getCritMulti(true);
        }

        //Heirloom Switch
        if (eHealth > 0) {
            var hitsLow = (eHealth / attackLow);
            var hitsHigh = (eHealth / attackHigh);
            var stacks = 190;
            var useHigh = false;
            var stacksLeft = 1;

            if (game.global.challengeActive != "Daily" && getPageSetting('WindStackingMax') > 0) stacks = getPageSetting('WindStackingMax');
            if (game.global.challengeActive == "Daily" && getPageSetting('dWindStackingMax') > 0) stacks = getPageSetting('dWindStackingMax');
            if (game.global.uberNature == "Wind") stacks += 100;
            if (getEmpowerment() == "Wind") stacksLeft = (stacks - game.empowerments.Wind.currentDebuffPower);

            //Use High
            if ((getEmpowerment() != "Wind") || (game.empowerments.Wind.currentDebuffPower >= stacks) || (hitsHigh >= stacksLeft)
                || (game.global.mapsActive) || (game.global.challengeActive != "Daily" && game.global.world < getPageSetting('WindStackingMin'))
                    || (game.global.challengeActive == "Daily" && game.global.world < getPageSetting('dWindStackingMin')))
                        useHigh = true;

            if ((getPageSetting('wsmax') > 0 && game.global.world >= getPageSetting('wsmax') && !game.global.mapsActive && getEmpowerment() == "Wind" && game.global.challengeActive != "Daily" && getPageSetting('wsmaxhd') > 0 && calcHDRatio() < getPageSetting('wsmaxhd'))
                || (getPageSetting('dwsmax') > 0 && game.global.world >= getPageSetting('dwsmax') && !game.global.mapsActive && getEmpowerment() == "Wind" && game.global.challengeActive == "Daily" && getPageSetting('dwsmaxhd') > 0 && calcHDRatio() < getPageSetting('dwsmaxhd')))
                    useHigh = false;

            //Low
            if (!useHigh) {
                if ((game.empowerments.Wind.currentDebuffPower >= stacks) || ((hitsLow * 4) > stacksLeft)) return 2;
                else if ((hitsLow) > stacksLeft) return 0;
                else return 1;
            }

            //High
            else if (useHigh) {
                if (game.global.mapsActive || getEmpowerment() != "Wind"
                    || game.empowerments.Wind.currentDebuffPower >= stacks || (hitsHigh * 4) > stacksLeft
                        || (game.global.challengeActive != "Daily" && game.global.world < getPageSetting('WindStackingMin'))
                            || (game.global.challengeActive == "Daily" && game.global.world < getPageSetting('dWindStackingMin')))
                                return 12;

                else if (hitsHigh > stacksLeft) return 10;
                else return 11;
            }
        }
    }
}

//Radon
function RgetCritMulti() {

    var critChance = getPlayerCritChance();
    var CritD = getPlayerCritDamageMult();

    var lowTierMulti = getMegaCritDamageMult(Math.floor(critChance));
    var highTierMulti = getMegaCritDamageMult(Math.ceil(critChance));
    var highTierChance = critChance - Math.floor(critChance)

    return ((1 - highTierChance) * lowTierMulti + highTierChance * highTierMulti) * CritD
}

function RcalcOurDmg(minMaxAvg, equality) {

    // Base + equipment
    var number = 6;
    var equipmentList = ["Dagger", "Mace", "Polearm", "Battleaxe", "Greatsword", "Arbalest"];
    for(var i = 0; i < equipmentList.length; i++){
        if(game.equipment[equipmentList[i]].locked !== 0) continue;
        var attackBonus = game.equipment[equipmentList[i]].attackCalculated;
        var level       = game.equipment[equipmentList[i]].level;
        number += attackBonus*level;
    }

    // Soldiers
    number *= game.resources.trimps.maxSoldiers;

    // Smithies
    number *= Math.pow(1.25, game.buildings.Smithy.owned);

    // Achievement bonus
    number *= 1 + (game.global.achievementBonus / 100);

    // Power
    number += (number * game.portal.Power.radLevel * game.portal.Power.modifier);

    // Map Bonus
    var mapBonus = game.global.mapBonus;
    if (game.talents.mapBattery.purchased && mapBonus == 10) mapBonus *= 2;
    number *= 1 + (mapBonus * .2);

    // Tenacity
    number *= game.portal.Tenacity.getMult();

    // Hunger
    number *= game.portal.Hunger.getMult();
	
    // Ob
    number *= game.portal.Observation.getMult();

    // Robotrimp
    number *= 1 + (0.2 * game.global.roboTrimpLevel);

    // Mayhem Completions
    number *= game.challenges.Mayhem.getTrimpMult();

    // Heirloom
    number *= 1 + calcHeirloomBonus('Shield','trimpAttack',1,true) / 100;

    // Frenzy perk
    //number *= (game.portal.Frenzy.frenzyTime) ? game.portal.Frenzy.getAttackMult() : 1;
	
    // Golden Upgrade
    number *= 1 + game.goldenUpgrades.Battle.currentBonus;

    // Herbalist Mastery
    if (game.talents.herbalist.purchased) {
        number *= game.talents.herbalist.getBonus();
    }

    // Challenge 2 or 3 reward
    number *= 1 + (game.global.totalSquaredReward / 100);

    // Fluffy Modifier
    number *= Fluffy.getDamageModifier();

    // Pspire Strength Towers
    number *= 1 + (playerSpireTraps.Strength.getWorldBonus() / 100);

    // Sharp Trimps
    if (game.singleRunBonuses.sharpTrimps.owned){
	number *= 1.5;
    }

    // Sugar rush event bonus
    if (game.global.sugarRush) {
	number *= sugarRush.getAttackStrength();
    }

    // Challenges
    if (game.global.challengeActive == "Melt") {number *= 5 * Math.pow(0.99, game.challenges.Melt.stacks);}
    if (game.global.challengeActive == "Unbalance") {number *= game.challenges.Unbalance.getAttackMult();}
    if (game.global.challengeActive == "Quagmire") {number *= game.challenges.Quagmire.getExhaustMult();}
    if (game.global.challengeActive == "Revenge") {number *= game.challenges.Revenge.getMult();}
    if (game.global.challengeActive == "Quest") {number *= game.challenges.Quest.getAttackMult();}
    if (game.global.challengeActive == "Archaeology") {number *= game.challenges.Archaeology.getStatMult("attack");}
    if (game.global.challengeActive == "Berserk") {number *= game.challenges.Berserk.getAttackMult();}
    if (game.challenges.Nurture.boostsActive() == true) {number *= game.challenges.Nurture.getStatBoost();}

    // Dailies
    var minDailyMod = 1;
    var maxDailyMod = 1;
    if (game.global.challengeActive == "Daily") {
        // Legs for Days mastery
        if (game.talents.daily.purchased){
            number *= 1.5;
        }

        // Min damage reduced (additive)
	if (typeof game.global.dailyChallenge.minDamage !== 'undefined') {
	    minDailyMod -= dailyModifiers.minDamage.getMult(game.global.dailyChallenge.minDamage.strength);
        }
        // Max damage increased (additive)
	if (typeof game.global.dailyChallenge.maxDamage !== 'undefined') {
	    maxDailyMod += dailyModifiers.maxDamage.getMult(game.global.dailyChallenge.maxDamage.strength);
        }

        // Minus attack on odd zones
	if (typeof game.global.dailyChallenge.oddTrimpNerf !== 'undefined' && ((game.global.world % 2) == 1)) {
	    number *= dailyModifiers.oddTrimpNerf.getMult(game.global.dailyChallenge.oddTrimpNerf.strength);
        }
        // Bonus attack on even zones
	if (typeof game.global.dailyChallenge.evenTrimpBuff !== 'undefined' && ((game.global.world % 2) == 0)) {
	    number *= dailyModifiers.evenTrimpBuff.getMult(game.global.dailyChallenge.evenTrimpBuff.strength);
        }
        // Rampage Daily mod
	if (typeof game.global.dailyChallenge.rampage !== 'undefined') {
	    number *= dailyModifiers.rampage.getMult(game.global.dailyChallenge.rampage.strength, game.global.dailyChallenge.rampage.stacks);
	}
    }

    // Equality
    if (getPageSetting('Rcalcmaxequality') == 1 && !equality) {
        number *= Math.pow(game.portal.Equality.modifier, game.portal.Equality.scalingCount);
    } else if (getPageSetting('Rcalcmaxequality') == 0 && !equality) {
        number *= game.portal.Equality.getMult();
    } else {
        number *= 1;
    }

    // Gamma Burst
    if (getHeirloomBonus("Shield", "gammaBurst") > 0 && (RcalcOurHealth() / (RcalcBadGuyDmg(null, RgetEnemyMaxAttack(game.global.world, 50, 'Snimp', 1.0))) >= 5)) {
        number *= 1 + (getHeirloomBonus("Shield", "gammaBurst") / 100) / 5;
    }

    // Average out crit damage
    number *= RgetCritMulti();

    switch (minMaxAvg) {
        case 'min':
            return number * (game.portal.Range.radLevel * 0.02 + 0.8) * minDailyMod;
        case 'max':
            return number * 1.2 * maxDailyMod;
        case 'avg':
            return number;
    }

    return number;
}

function RcalcOurHealth() {
	
    //Health
	
    var health = 50;
    if (game.resources.trimps.maxSoldiers > 0) {
        var equipmentList = ["Shield", "Boots", "Helmet", "Pants", "Shoulderguards", "Breastplate", "Gambeson"];
        for(var i = 0; i < equipmentList.length; i++){
            if(game.equipment[equipmentList[i]].locked !== 0) continue;
            var healthBonus = game.equipment[equipmentList[i]].healthCalculated;
            var level       = game.equipment[equipmentList[i]].level;
            health += healthBonus*level;
        }
    }
    health *= game.resources.trimps.maxSoldiers;
    if (game.buildings.Smithy.owned > 0) {
		health *= Math.pow(1.25, game.buildings.Smithy.owned);
    }
    if (game.portal.Toughness.radLevel > 0) {
        health *= ((game.portal.Toughness.radLevel * game.portal.Toughness.modifier) + 1);
    }
    if (game.portal.Resilience.radLevel > 0) {
        health *= (Math.pow(game.portal.Resilience.modifier + 1, game.portal.Resilience.radLevel));
    }
    if (game.portal.Observation.radLevel > 0) {
    	health *= game.portal.Observation.getMult();
    }
    if (Fluffy.isRewardActive("healthy")) {
		health *= 1.5;
    }
    health = calcHeirloomBonus("Shield", "trimpHealth", health);
    if (game.goldenUpgrades.Battle.currentBonus > 0) {
        health *= game.goldenUpgrades.Battle.currentBonus + 1;
    }
    if (game.global.totalSquaredReward > 0) {
        health *= (1 + (game.global.totalSquaredReward / 100));
    }
    if (game.global.challengeActive == "Revenge" && game.challenges.Revenge.stacks > 0) {
	health *= game.challenges.Revenge.getMult();
    }
    if (game.global.challengeActive == "Wither" && game.challenges.Wither.trimpStacks > 0) {
	health *= game.challenges.Wither.getTrimpHealthMult();
    }
    if (game.global.mayhemCompletions > 0) {
	health *= game.challenges.Mayhem.getTrimpMult();
    }
    if (game.global.challengeActive == "Insanity") {
	health *= game.challenges.Insanity.getHealthMult();
    }
    if (game.global.challengeActive == "Berserk") {
	if (game.challenges.Berserk.frenzyStacks > 0) {
	    health *= 0.5;
	}
	if (game.challenges.Berserk.frenzyStacks <= 0) {
	    health *= game.challenges.Berserk.getHealthMult(true);
	}
    }
    if (game.challenges.Nurture.boostsActive() == true) {
	health *= game.challenges.Nurture.getStatBoost();
    }
    if (typeof game.global.dailyChallenge.pressure !== 'undefined') {
        health *= (dailyModifiers.pressure.getMult(game.global.dailyChallenge.pressure.strength, game.global.dailyChallenge.pressure.stacks));
    }
	
    //Pris
	
    health *= (getEnergyShieldMult() + 1);
	
    return health;
}

function RcalcDailyAttackMod(number) {
    if (game.global.challengeActive == "Daily"){
        if (typeof game.global.dailyChallenge.badStrength !== 'undefined'){
            number *= dailyModifiers.badStrength.getMult(game.global.dailyChallenge.badStrength.strength);
        }
        if (typeof game.global.dailyChallenge.badMapStrength !== 'undefined' && game.global.mapsActive){
            number *= dailyModifiers.badMapStrength.getMult(game.global.dailyChallenge.badMapStrength.strength);
        }
        if (typeof game.global.dailyChallenge.bloodthirst !== 'undefined'){
            number *= dailyModifiers.bloodthirst.getMult(game.global.dailyChallenge.bloodthirst.strength, game.global.dailyChallenge.bloodthirst.stacks);
        }
    }
    return number;
}

function RcalcBadGuyDmg(enemy, attack, equality) {
    var number;
    if (enemy)
        number = enemy.attack;
    else
        number = attack;
    if (getPageSetting('Rexterminateon') == true && getPageSetting('Rexterminatecalc') == true) {
	number = RgetEnemyMaxAttack(game.global.world, 90, 'Mantimp', 1.0)
    }
    if (game.portal.Equality.radLevel > 0 && getPageSetting('Rcalcmaxequality') == 0 && !equality) {
        number *= game.portal.Equality.getMult();
    }
    else if (game.portal.Equality.radLevel > 0 && getPageSetting('Rcalcmaxequality') >= 1 && game.portal.Equality.scalingCount > 0 && !equality) {
        number *= Math.pow(game.portal.Equality.modifier, game.portal.Equality.scalingCount);
    }
    if (game.global.challengeActive == "Daily") {
        number = RcalcDailyAttackMod(number);
    }
    if (game.global.challengeActive == "Unbalance") {
	number *= 1.5;
    }
    if (game.global.challengeActive == "Wither" && game.challenges.Wither.enemyStacks > 0) {
	number *= game.challenges.Wither.getEnemyAttackMult();
    }
    if (game.global.challengeActive == "Archaeology") {
	number *= game.challenges.Archaeology.getStatMult("enemyAttack");
    }
    if (game.global.challengeActive == "Mayhem") {
	number *= game.challenges.Mayhem.getEnemyMult();
	number *= game.challenges.Mayhem.getBossMult();
    }
    if (game.global.challengeActive == "Storm") {
	number *= game.challenges.Storm.getAttackMult();
    }
    if (game.global.challengeActive == "Berserk") {
	number *= 1.5;
    }
    if (game.global.challengeActive == "Exterminate") {
	number *= game.challenges.Exterminate.getSwarmMult();
    }
    if (game.global.challengeActive == "Nurture") {
	number *= 2;
	if (game.buildings.Laboratory.owned > 0) {
	    number *= game.buildings.Laboratory.getEnemyMult();
	}
    }
    if (!enemy && game.global.usingShriek) {
        number *= game.mapUnlocks.roboTrimp.getShriekValue();
    }
    return number;
}

function RcalcEnemyBaseHealth(world, level, name) {
			var amt = 0;
			var healthBase = (game.global.universe == 2) ? 10e7 : 130;
			amt += healthBase * Math.sqrt(world) * Math.pow(3.265, world / 2);
			amt -= 110;
			if (world == 1 || world == 2 && level < 10){
				amt *= 0.6;
			amt = (amt * 0.25) + ((amt * 0.72) * (level / 100));
			}
			else if (world < 60)
				amt = (amt * 0.4) + ((amt * 0.4) * (level / 110));
			else{
				amt = (amt * 0.5) + ((amt * 0.8) * (level / 100));
				amt *= Math.pow(1.1, world - 59);
			}
			if (world < 60) amt *= 0.75;
			if (world > 5 && game.global.mapsActive) amt *= 1.1;
		        amt *= game.badGuys[name].health;
			if (game.global.universe == 2) {
				var part1 = (world > 60) ? 60 : world;
				var part2 = (world - 60);
				if (part2 < 0) part2 = 0;
				amt *= Math.pow(1.4, part1);
				amt *= Math.pow(1.32, part2);
			}
			return Math.floor(amt);
}

function RcalcEnemyHealth(world) {
    if (world == false) world = game.global.world;
    var health = RcalcEnemyBaseHealth(world, 50, "Snimp");
    if (getPageSetting('Rexterminateon') == true && getPageSetting('Rexterminatecalc') == true) {
	health = RcalcEnemyBaseHealth(world, 90, "Beetlimp");
    }
    if (game.global.challengeActive == "Unbalance") {
	health *= 2;
    }
    if (game.global.challengeActive == "Quest"){
	health *= game.challenges.Quest.getHealthMult();
    }
    if (game.global.challengeActive == "Revenge" && game.global.world % 2 == 0) {
	health *= 10;
    }
    if (game.global.challengeActive == "Archaeology") {
	
    }
    if (game.global.challengeActive == "Mayhem") {
	health *= game.challenges.Mayhem.getEnemyMult();
	health *= game.challenges.Mayhem.getBossMult();
    }
    if (game.global.challengeActive == "Storm") {
	health *= game.challenges.Storm.getHealthMult();
    }
    if (game.global.challengeActive == "Berserk") {
	health *= 1.5;
    }
    if (game.global.challengeActive == "Exterminate") {
	health *= game.challenges.Exterminate.getSwarmMult();
    }
    if (game.global.challengeActive == "Nurture") {
	health *= 2;
	if (game.buildings.Laboratory.owned > 0) {
	    health *= game.buildings.Laboratory.getEnemyMult();
	}
    }
    return health;
}

function RcalcEnemyHealthMod(world, cell, name) {
    if (world == false) world = game.global.world;
    var health = RcalcEnemyBaseHealth(world, cell, name);
    if (game.global.challengeActive == "Unbalance") {
	health *= 2;
    }
    if (game.global.challengeActive == "Quest"){
	health *= game.challenges.Quest.getHealthMult();
    }
    if (game.global.challengeActive == "Revenge" && game.global.world % 2 == 0) {
	health *= 10;
    }
    if (game.global.challengeActive == "Archaeology") {

    }
    if (game.global.challengeActive == "Mayhem") {
	health *= game.challenges.Mayhem.getEnemyMult();
	health *= game.challenges.Mayhem.getBossMult();
    }
    if (game.global.challengeActive == "Storm") {
	health *= game.challenges.Storm.getHealthMult();
    }
    if (game.global.challengeActive == "Berserk") {
	health *= 1.5;
    }
    if (game.global.challengeActive == "Exterminate") {
	health *= game.challenges.Exterminate.getSwarmMult();
    }
    if (game.global.challengeActive == "Nurture") {
	number *= 2;
	if (game.buildings.Laboratory.owned > 0) {
	    number *= game.buildings.Laboratory.getEnemyMult();
	}
    }
    return health;
}

function RcalcHDratio() {
    var ratio;
    var ourBaseDamage = RcalcOurDmg("avg", false, true);

    ratio = RcalcEnemyHealth(game.global.world) / ourBaseDamage;
    return ratio;
}

function getTotalHealthMod() {
    var healthMulti = 1;

    // Smithies
    healthMulti *= game.buildings.Smithy.getMult();

    // Perks
    healthMulti *= 1 + (game.portal.Toughness.radLevel * game.portal.Toughness.modifier);
    healthMulti *= Math.pow(1 + game.portal.Resilience.modifier, game.portal.Resilience.radLevel);
    healthMulti *= game.portal.Observation.getMult();

    // Scruffy's +50% health bonus
    healthMulti *= (Fluffy.isRewardActive("healthy") ? 1.5 : 1);

    // Heirloom Health bonus
    healthMulti *= 1 + calcHeirloomBonus('Shield', 'trimpHealth',1, true) / 100;

    // Golden Upgrades
    healthMulti *= 1 + game.goldenUpgrades.Battle.currentBonus;

    // C2/3
    healthMulti *= 1 + game.global.totalSquaredReward / 100;

    // Challenge Multis
    healthMulti *= (game.global.challengeActive == 'Revenge') ? game.challenges.Revenge.getMult() : 1;
    healthMulti *= (game.global.challengeActive == 'Wither') ? game.challenges.Wither.getTrimpHealthMult() : 1;
    healthMulti *= (game.global.challengeActive == 'Insanity') ? game.challenges.Insanity.getHealthMult() : 1;
    healthMulti *= (game.global.challengeActive == 'Berserk') ?
        (game.challenges.Berserk.frenzyStacks > 0) ? 0.5 : game.challenges.Berserk.getHealthMult(true)
        : 1;
    healthMulti *= (game.challenges.Nurture.boostsActive() == true) ? game.challenges.Nurture.getStatBoost() : 1;

    // Daily mod
    healthMulti *= (typeof game.global.dailyChallenge.pressure !== 'undefined') ? dailyModifiers.pressure.getMult(game.global.dailyChallenge.pressure.strength, game.global.dailyChallenge.pressure.stacks) : 1;

    // Mayhem
    healthMulti *= game.challenges.Mayhem.getTrimpMult();

    // Prismatic
    healthMulti *= 1 + getEnergyShieldMult();

    return healthMulti;
}

function stormdynamicHD() {
    var stormzone = 0;
    var stormHD = 0;
    var stormmult = 0;
    var stormHDzone = 0;
    var stormHDmult = 1;
    if (getPageSetting('Rstormon') == true && game.global.world > 5 && (game.global.challengeActive == "Storm" && getPageSetting('Rstormzone') > 0 && getPageSetting('RstormHD') > 0 && getPageSetting('Rstormmult') > 0)) {
        stormzone = getPageSetting('Rstormzone');
        stormHD = getPageSetting('RstormHD');
        stormmult = getPageSetting('Rstormmult');
	stormHDzone = (game.global.world - stormzone);
	stormHDmult = (stormHDzone == 0) ? stormHD : Math.pow(stormmult, stormHDzone) * stormHD;
    }
    return stormHDmult;
}
