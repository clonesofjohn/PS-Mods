exports.BattleFormats = {
	pokemon: {
		effectType: 'Banlist',
		validateSet: function (set, format, isNonstandard) {
			var item = this.getItem(set.item);
			var template = this.getTemplate(set.species);
			var problems = [];
			var totalEV = 0;

			if (set.species === set.name) delete set.name;
			if (template.gen > this.gen) {
				problems.push(set.species + ' does not exist in gen ' + this.gen + '.');
			}
			var ability = {};
			if (set.ability) {
				ability = this.getAbility(set.ability);
				if (ability.gen > this.gen) {
					problems.push(ability.name + ' does not exist in gen ' + this.gen + '.');
				}
			}
			if (set.moves) {
				for (var i = 0; i < set.moves.length; i++) {
					var move = this.getMove(set.moves[i]);
					if (move.gen > this.gen) {
						problems.push(move.name + ' does not exist in gen ' + this.gen + '.');
					} else if (!isNonstandard && move.isNonstandard) {
						problems.push(move.name + ' is not a real move.');
					}
				}
			}
			if (item.gen > this.gen) {
				problems.push(item.name + ' does not exist in gen ' + this.gen + '.');
			}
			if (set.moves && set.moves.length > 4) {
				problems.push((set.name || set.species) + ' has more than four moves.');
			}
			if (set.level && set.level > 100) {
				problems.push((set.name || set.species) + ' is higher than level 100.');
			}

			if (!isNonstandard) {
				if (template.isNonstandard) {
					problems.push(set.species + ' is not a real Pokemon.');
				}
				if (ability.isNonstandard) {
					problems.push(ability.name + ' is not a real ability.');
				}
				if (item.isNonstandard) {
					problems.push(item.name + ' is not a real item.');
				}
			}
			for (var k in set.evs) {
				if (typeof set.evs[k] !== 'number' || set.evs[k] < 0) {
					set.evs[k] = 0;
				}
				totalEV += set.evs[k];
			}
			// In gen 6, it is impossible to battle other players with pokemon that break the EV limit
			if (totalEV > 510 && this.gen >= 6) {
				problems.push((set.name || set.species) + " has more than 510 total EVs.");
			}

			// ----------- legality line ------------------------------------------
			if (!format.banlistTable || !format.banlistTable['illegal']) return problems;
			// everything after this line only happens if we're doing legality enforcement

			// only in gen 1 and 2 it was legal to max out all EVs
			if (this.gen >= 3 && totalEV > 510) {
				problems.push((set.name || set.species) + " has more than 510 total EVs.");
			}

			// limit one of each move
			var moves = [];
			if (set.moves) {
				var hasMove = {};
				for (var i = 0; i < set.moves.length; i++) {
					var move = this.getMove(set.moves[i]);
					var moveid = move.id;
					if (hasMove[moveid]) continue;
					hasMove[moveid] = true;
					moves.push(set.moves[i]);
				}
			}
			set.moves = moves;
			
			if (template.isMega) {
				if (template.tier === 'MM') {
					if (template.forme === 'Mega' && item.id !== 'megastone') problems.push((set.name || set.species) + ' needs to hold Mega Stone.');
				}
				// Mega evolutions evolve in-battle
				set.species = template.baseSpecies;
				var baseAbilities = Tools.getTemplate(set.species).abilities;
				var niceAbility = false;
				for (var i in baseAbilities) {
					if (baseAbilities[i] === set.ability) {
						niceAbility = true;
						break;
					}
				}
				if (!niceAbility) set.ability = baseAbilities['0'];
			}
			
			// validate banned abilities
			var bannedAbilities = {'Arena Trap':1,'Huge Power':1,'Imposter':1,'Parental Bond':1,'Pure Power':1,'Shadow Tag':1,'Wonder Guard':1};
			if (set.ability in bannedAbilities) {
				var template = this.getTemplate(set.species || set.name);
				var legalAbility = false;
				for (var i in template.abilities) {
					if (set.ability === template.abilities[i]) legalAbility = true;
				}
				if (!legalAbility) return ['The ability ' + set.ability + ' is banned on Pokémon that do not naturally have it.'];
			}
			
			if (template.requiredItem) {
				if (item.name !== template.requiredItem) {
					problems.push((set.name || set.species) + ' needs to hold ' + template.requiredItem + '.');
				}
			}
			if (template.num === 351) { // Castform
				set.species = 'Castform';
			}
			if (template.num === 421) { // Cherrim
				set.species = 'Cherrim';
			}
			if (template.num === 493) { // Arceus
				if (set.ability === 'Multitype' && item.onPlate) {
					set.species = 'Arceus-' + item.onPlate;
				} else {
					set.species = 'Arceus';
				}
			}
			if (template.num === 555) { // Darmanitan
				if (set.species === 'Darmanitan-Zen' && ability.id !== 'zenmode') {
					problems.push('Darmanitan-Zen transforms in-battle with Zen Mode.');
				}
				set.species = 'Darmanitan';
			}
			if (template.num === 487) { // Giratina
				if (item.id === 'griseousorb') {
					set.species = 'Giratina-Origin';
					set.ability = 'Levitate';
				} else {
					set.species = 'Giratina';
					set.ability = 'Pressure';
				}
			}
			if (template.num === 647) { // Keldeo
				if (set.moves.indexOf('secretsword') < 0) {
					set.species = 'Keldeo';
				}
			}
			if (template.num === 648) { // Meloetta
				if (set.species === 'Meloetta-Pirouette' && set.moves.indexOf('relicsong') < 0) {
					problems.push('Meloetta-Pirouette transforms in-battle with Relic Song.');
				}
				set.species = 'Meloetta';
			}
			if (template.num === 649) { // Genesect
				switch (item.id) {
					case 'burndrive':
						set.species = 'Genesect-Burn';
						break;
					case 'chilldrive':
						set.species = 'Genesect-Chill';
						break;
					case 'dousedrive':
						set.species = 'Genesect-Douse';
						break;
					case 'shockdrive':
						set.species = 'Genesect-Shock';
						break;
					default:
						set.species = 'Genesect';
				}
			}
			if (template.num === 681) { // Aegislash
				set.species = 'Aegislash';
			}
			return problems;
		}
	},
}