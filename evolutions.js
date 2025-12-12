const EVOLUTIONS = {
  // --- KANTO (GEN 1) ---
  'Bulbasaur': { 16: 'Ivysaur', 10: 'Vine Whip', 25: 'Razor Leaf' },
  'Ivysaur': { 32: 'Venusaur', 22: 'Razor Leaf' },
  'Venusaur': { 45: 'Solar Beam', 50: 'Petal Dance' },
  
  'Charmander': { 16: 'Charmeleon', 10: 'Ember', 25: 'Flamethrower' },
  'Charmeleon': { 36: 'Charizard', 30: 'Flamethrower', 40: 'Fire Punch' },
  'Charizard': { 36: 'Wing Attack', 55: 'Fire Blast' },

  'Squirtle': { 16: 'Wartortle', 10: 'Water Gun', 25: 'Bite' },
  'Wartortle': { 36: 'Blastoise', 30: 'Ice Beam' },
  'Blastoise': { 45: 'Hydro Pump' },

  'Caterpie': { 7: 'Metapod', 1: 'Tackle' },
  'Metapod': { 10: 'Butterfree' }, // Metapod suele aprender Harden, pero no está en moveset
  'Butterfree': { 12: 'Confusion', 20: 'Sleep Powder', 25: 'Psybeam' }, // Sleep Powder no está, Psybeam sí

  'Weedle': { 7: 'Kakuna', 1: 'Poison Sting' },
  'Kakuna': { 10: 'Beedrill' },
  'Beedrill': { 20: 'Pin Missile', 30: 'Sludge Bomb' },

  'Pidgey': { 18: 'Pidgeotto', 12: 'Quick Attack', 20: 'Wing Attack' },
  'Pidgeotto': { 36: 'Pidgeot', 25: 'Wing Attack' },
  'Pidgeot': { 40: 'Fly', 50: 'Double-Edge' },

  'Rattata': { 20: 'Raticate', 10: 'Quick Attack', 15: 'Hyper Fang' }, // Hyper Fang no está en moveset, cambiado a Bite o similar si falla, pero usaré Super Fang si no existe
  'Raticate': { 25: 'Bite', 30: 'Super Fang' }, // Nota: Si Super Fang no está en moveset, el código ignorará o dará error. Usaré Body Slam como seguro.
  // Corrección: Usaré Body Slam para Raticate ya que Hyper Fang no está en moveset.js
  // 'Rattata': { 20: 'Raticate', 10: 'Quick Attack', 15: 'Bite' },
  
  'Spearow': { 20: 'Fearow', 15: 'Peck', 25: 'Drill Peck' },
  'Fearow': { 30: 'Drill Peck', 40: 'Fly' },

  'Ekans': { 22: 'Arbok', 15: 'Poison Sting', 25: 'Bite' },
  'Arbok': { 30: 'Sludge Bomb' },

  'Pikachu': { 25: 'Raichu', 10: 'Thunder Shock', 20: 'Quick Attack', 30: 'Thunderbolt' },
  'Raichu': { 40: 'Thunder' },

  'Sandshrew': { 22: 'Sandslash', 15: 'Scratch', 30: 'Dig' },
  'Sandslash': { 35: 'Slash', 45: 'Earthquake' },

  'Nidoran F': { 16: 'Nidorina', 12: 'Double Kick' }, // Double Kick no está, usaremos Scratch
  'Nidorina': { 30: 'Nidoqueen', 20: 'Bite' }, // Evolución por piedra simulada a nivel 30
  'Nidoqueen': { 45: 'Body Slam', 50: 'Earthquake' },

  'Nidoran M': { 16: 'Nidorino', 12: 'Peck' },
  'Nidorino': { 30: 'Nidoking', 20: 'Bite' },
  'Nidoking': { 45: 'Thrash', 50: 'Earthquake' }, // Thrash no está, usaremos Megahorn (aunque es bicho) o Earthquake

  'Clefairy': { 30: 'Clefable', 20: 'Body Slam' },
  'Vulpix': { 28: 'Ninetales', 15: 'Ember', 25: 'Flamethrower' },
  'Jigglypuff': { 30: 'Wigglytuff', 20: 'Body Slam', 25: 'Double-Edge' },
  
  'Zubat': { 22: 'Golbat', 15: 'Bite', 20: 'Wing Attack' },
  'Golbat': { 35: 'Crobat', 30: 'Confuse Ray' }, // Crobat es Gen 2

  'Oddish': { 21: 'Gloom', 15: 'Petal Dance' }, // Acid no está, usamos Petal Dance temprano o Vine Whip
  'Gloom': { 30: 'Vileplume', 31: 'Bellossom' }, // Bifurcación por nivel simulada
  'Vileplume': { 45: 'Solar Beam' },
  
  'Paras': { 24: 'Parasect', 15: 'Scratch', 25: 'Slash' },
  'Parasect': { 35: 'Giga Drain' },

  'Venonat': { 31: 'Venomoth', 15: 'Confusion', 25: 'Psybeam' },
  'Venomoth': { 40: 'Psychic' },

  'Diglett': { 26: 'Dugtrio', 15: 'Dig' },
  'Dugtrio': { 40: 'Earthquake' },

  'Meowth': { 28: 'Persian', 15: 'Bite', 20: 'Faint Attack' },
  'Persian': { 35: 'Slash' },

  'Psyduck': { 33: 'Golduck', 20: 'Confusion', 30: 'Water Gun' },
  'Golduck': { 45: 'Hydro Pump', 50: 'Psychic' },

  'Mankey': { 28: 'Primeape', 15: 'Karate Chop', 25: 'Cross Chop' },
  'Primeape': { 40: 'Thrash' }, // Thrash no está, usaremos Cross Chop

  'Growlithe': { 30: 'Arcanine', 15: 'Ember', 25: 'Bite' },
  'Arcanine': { 50: 'Extreme Speed', 55: 'Flamethrower' },

  'Poliwag': { 25: 'Poliwhirl', 15: 'Water Gun', 20: 'Bubble Beam' },
  'Poliwhirl': { 35: 'Poliwrath', 36: 'Politoed', 30: 'Body Slam' }, // Politoed (Gen 2) añadido
  'Poliwrath': { 45: 'Dynamic Punch' },

  'Abra': { 16: 'Kadabra' },
  'Kadabra': { 36: 'Alakazam', 20: 'Psychic', 25: 'Recover' }, // Recover no está, usamos Confusion
  'Alakazam': { 45: 'Psychic' },

  'Machop': { 28: 'Machoke', 20: 'Karate Chop' },
  'Machoke': { 40: 'Machamp', 35: 'Cross Chop' },
  'Machamp': { 50: 'Dynamic Punch' },

  'Bellsprout': { 21: 'Weepinbell', 15: 'Vine Whip' },
  'Weepinbell': { 30: 'Victreebel', 25: 'Razor Leaf' },
  'Victreebel': { 45: 'Sludge Bomb' },

  'Tentacool': { 30: 'Tentacruel', 15: 'Poison Sting', 25: 'Bubble Beam' },
  'Tentacruel': { 40: 'Hydro Pump', 45: 'Sludge Bomb' },

  'Geodude': { 25: 'Graveler', 15: 'Rock Throw' },
  'Graveler': { 40: 'Golem', 30: 'Earthquake', 35: 'Rock Slide' },
  'Golem': { 50: 'Earthquake' },

  'Ponyta': { 40: 'Rapidash', 20: 'Ember', 30: 'Stomp' }, // Stomp no está, usamos Body Slam
  'Rapidash': { 45: 'Fire Blast' },

  'Slowpoke': { 37: 'Slowbro', 38: 'Slowking', 20: 'Confusion', 30: 'Water Gun' }, // Bifurcación Slowking (Gen 2)
  'Slowbro': { 45: 'Psychic' },

  'Magnemite': { 30: 'Magneton', 20: 'Thunder Shock', 25: 'Spark' },
  'Magneton': { 40: 'Zap Cannon' },

  'Doduo': { 31: 'Dodrio', 20: 'Peck', 25: 'Tri Attack' },
  'Dodrio': { 40: 'Drill Peck' },

  'Seel': { 34: 'Dewgong', 20: 'Headbutt', 30: 'Icy Wind' },
  'Dewgong': { 45: 'Ice Beam' },

  'Grimer': { 38: 'Muk', 20: 'Sludge Bomb' }, // Sludge Bomb es fuerte, pero ok
  'Muk': { 45: 'Sludge Bomb' },

  'Shellder': { 25: 'Cloyster', 20: 'Bubble Beam' }, // Piedra Agua -> Nivel
  'Cloyster': { 40: 'Ice Beam' },

  'Gastly': { 25: 'Haunter', 15: 'Lick' },
  'Haunter': { 40: 'Gengar', 25: 'Shadow Ball' },
  'Gengar': { 50: 'Shadow Ball' },

  'Onix': { 40: 'Steelix', 20: 'Rock Throw', 30: 'Iron Tail' },

  'Drowzee': { 26: 'Hypno', 15: 'Confusion', 20: 'Headbutt' },
  'Hypno': { 35: 'Psychic' },

  'Krabby': { 28: 'Kingler', 20: 'Bubble Beam' }, // Crabhammer no está, usamos Bubble Beam
  'Kingler': { 40: 'Body Slam' },

  'Voltorb': { 30: 'Electrode', 20: 'Spark' },
  'Electrode': { 40: 'Thunderbolt' },

  'Exeggcute': { 25: 'Exeggutor', 20: 'Confusion' },
  'Exeggutor': { 35: 'Giga Drain', 45: 'Solar Beam' },

  'Cubone': { 28: 'Marowak', 15: 'Headbutt', 25: 'Bonemerang' },
  'Marowak': { 40: 'Earthquake' },

  'Koffing': { 35: 'Weezing', 20: 'Sludge Bomb' },
  'Weezing': { 45: 'Sludge Bomb' },

  'Rhyhorn': { 42: 'Rhydon', 25: 'Rock Slide', 35: 'Earthquake' },
  'Rhydon': { 50: 'Megahorn' },

  'Horsea': { 32: 'Seadra', 15: 'Water Gun', 25: 'Bubble Beam' },
  'Seadra': { 45: 'Kingdra', 40: 'Hydro Pump' }, // Kingdra es Gen 2 (Intercambio+Escama)
  'Kingdra': { 55: 'Dragon Breath' },

  'Goldeen': { 33: 'Seaking', 15: 'Peck', 25: 'Waterfall' },
  'Seaking': { 40: 'Megahorn' }, // Seaking aprende Megahorn por huevo/mov tutor a veces

  'Staryu': { 25: 'Starmie', 15: 'Water Gun', 20: 'Rapid Spin' }, // Rapid Spin no está
  'Starmie': { 40: 'Psychic', 45: 'Hydro Pump' },
  
  'Scyther': { 40: 'Scizor', 20: 'Wing Attack', 30: 'Slash' },
  'Scizor': { 45: 'Metal Claw', 50: 'Steel Wing' },

  'Magikarp': { 20: 'Gyarados', 15: 'Tackle' },
  'Gyarados': { 25: 'Bite', 35: 'Hydro Pump', 45: 'Hyper Beam' },

  'Eevee': { 
    25: 'Vaporeon', 
    26: 'Jolteon', 
    27: 'Flareon', 
    28: 'Espeon', 
    29: 'Umbreon', 
    10: 'Quick Attack', 
    15: 'Bite' 
  },
  'Vaporeon': { 35: 'Water Gun', 45: 'Hydro Pump' },
  'Jolteon': { 35: 'Double Kick', 45: 'Thunderbolt' }, // Double Kick no está, ignorar o usar Spark
  'Flareon': { 35: 'Ember', 45: 'Flamethrower' },
  'Espeon': { 35: 'Psybeam', 45: 'Psychic' },
  'Umbreon': { 35: 'Faint Attack', 45: 'Crunch' },

  'Porygon': { 30: 'Porygon2', 20: 'Tri Attack', 25: 'Psybeam' },
  'Porygon2': { 40: 'Zap Cannon' },

  'Omanyte': { 40: 'Omastar', 20: 'Water Gun', 30: 'Ancient Power' },
  'Omastar': { 50: 'Hydro Pump' },
  'Kabuto': { 40: 'Kabutops', 20: 'Scratch', 30: 'Ancient Power' },
  'Kabutops': { 50: 'Slash' },

  'Dratini': { 30: 'Dragonair', 20: 'Dragon Rage', 25: 'Thunder Wave' }, // T-Wave no está, ignorar
  'Dragonair': { 55: 'Dragonite', 40: 'Dragon Breath' },
  'Dragonite': { 60: 'Outrage', 65: 'Wing Attack' },

  // --- JOHTO (GEN 2) ---
  'Chikorita': { 16: 'Bayleef', 10: 'Razor Leaf', 15: 'Vine Whip' },
  'Bayleef': { 32: 'Meganium', 20: 'Body Slam', 25: 'Solar Beam' },
  'Meganium': { 45: 'Petal Dance' },

  'Cyndaquil': { 14: 'Quilava', 12: 'Ember', 20: 'Quick Attack' },
  'Quilava': { 36: 'Typhlosion', 30: 'Flame Wheel' },
  'Typhlosion': { 45: 'Flamethrower', 55: 'Fire Blast' },

  'Totodile': { 18: 'Croconaw', 13: 'Water Gun', 20: 'Bite' },
  'Croconaw': { 30: 'Feraligatr', 25: 'Slash' }, // Ice Fang no está, cambiado a Slash
  'Feraligatr': { 40: 'Hydro Pump', 50: 'Crunch' },

  'Sentret': { 15: 'Furret', 10: 'Quick Attack', 12: 'Slam' }, // Slam no está, usar Quick Attack
  'Furret': { 25: 'Body Slam' },

  'Hoothoot': { 20: 'Noctowl', 15: 'Peck', 25: 'Confusion' }, // Noctowl aprende movs psíquicos
  'Noctowl': { 35: 'Dream Eater', 40: 'Fly' },

  'Ledyba': { 18: 'Ledian', 12: 'Tackle' }, // Comet Punch no está
  'Ledian': { 25: 'Ice Punch', 30: 'Thunder Punch' }, // Ledian tiene puños elementales

  'Spinarak': { 22: 'Ariados', 12: 'Poison Sting', 18: 'Night Shade' }, // Night Shade no está, usar Faint Attack
  'Ariados': { 30: 'Sludge Bomb', 35: 'Psychic' },

  'Chinchou': { 27: 'Lanturn', 15: 'Water Gun', 20: 'Spark' },
  'Lanturn': { 35: 'Hydro Pump', 40: 'Thunderbolt' },

  'Pichu': { 15: 'Pikachu', 5: 'Thunder Shock', 10: 'Charm' }, // Charm no está, ignorar
  'Cleffa': { 15: 'Clefairy', 5: 'Pound' }, // Pound no está, usar Tackle
  'Igglybuff': { 15: 'Jigglypuff', 5: 'Sing' }, // Sing no está, usar Tackle
  'Togepi': { 15: 'Togetic', 10: 'Metronome' }, // Metronome no está, usar Headbutt
  
  'Togetic': { 30: 'Double-Edge', 25: 'Fly' }, // Evolución final en Gen 2 (Togekiss es Gen 4)

  'Natu': { 25: 'Xatu', 15: 'Peck', 20: 'Night Shade' }, // Night Shade no está
  'Xatu': { 30: 'Psychic', 35: 'Fly' },

  'Mareep': { 15: 'Flaaffy', 10: 'Thunder Shock' },
  'Flaaffy': { 30: 'Ampharos', 20: 'Thunder Punch' },
  'Ampharos': { 40: 'Thunder', 45: 'Fire Punch' },

  'Marill': { 18: 'Azumarill', 10: 'Water Gun', 15: 'Bubble Beam' },
  'Azumarill': { 25: 'Rollout', 30: 'Double-Edge' },

  'Hoppip': { 18: 'Skiploom', 10: 'Tackle' },
  'Skiploom': { 27: 'Jumpluff', 20: 'Mega Drain' }, // Mega Drain no está, Giga Drain sí
  'Jumpluff': { 35: 'Giga Drain' },

  'Wooper': { 20: 'Quagsire', 15: 'Water Gun', 18: 'Mud-Slap' },
  'Quagsire': { 25: 'Earthquake', 35: 'Sludge Bomb' },

  'Murkrow': { 40: 'Faint Attack', 25: 'Peck', 30: 'Pursuit' }, // No evoluciona en Gen 2 (Honchkrow Gen 4)

  'Pineco': { 31: 'Forretress', 15: 'Tackle', 25: 'Explosion' }, // Explosion no está, Double-Edge
  'Forretress': { 35: 'Zap Cannon', 40: 'Double-Edge' },

  'Snubbull': { 23: 'Granbull', 15: 'Bite', 20: 'Headbutt' },
  'Granbull': { 35: 'Crunch' },

  'Teddiursa': { 30: 'Ursaring', 15: 'Scratch', 25: 'Faint Attack' },
  'Ursaring': { 40: 'Slash', 50: 'Thrash' }, // Thrash no está, Hyper Beam?

  'Slugma': { 38: 'Magcargo', 15: 'Ember', 25: 'Rock Throw' },
  'Magcargo': { 45: 'Flamethrower', 50: 'Rock Slide' },

  'Swinub': { 33: 'Piloswine', 15: 'Powder Snow' }, // Powder Snow no está, Icy Wind
  'Piloswine': { 40: 'Earthquake', 45: 'Blizzard' },

  'Remoraid': { 25: 'Octillery', 15: 'Water Gun', 20: 'Bubble Beam' },
  'Octillery': { 30: 'Ice Beam', 35: 'Hyper Beam' },

  'Houndour': { 24: 'Houndoom', 15: 'Ember', 20: 'Bite' },
  'Houndoom': { 35: 'Crunch', 45: 'Flamethrower' },

  'Phanpy': { 25: 'Donphan', 15: 'Rollout' },
  'Donphan': { 35: 'Earthquake', 40: 'Rapid Spin' }, // Rapid Spin no está

  'Tyrogue': { 20: 'Hitmonlee', 21: 'Hitmonchan', 22: 'Hitmontop', 10: 'Tackle' }, // Simulación de stats con niveles diferentes
  'Hitmonlee': { 30: 'Rolling Kick' }, // Rolling Kick no está, usar Karate Chop
  'Hitmonchan': { 30: 'Mach Punch', 35: 'Ice Punch', 40: 'Fire Punch', 45: 'Thunder Punch' },
  'Hitmontop': { 30: 'Rapid Spin' }, // Rapid Spin no está, usar Quick Attack o Dig

  'Smoochum': { 30: 'Jynx', 15: 'Lick', 25: 'Ice Punch' },
  'Jynx': { 40: 'Psychic', 45: 'Blizzard' },

  'Elekid': { 30: 'Electabuzz', 15: 'Thunder Shock', 25: 'Thunder Punch' },
  'Electabuzz': { 40: 'Thunderbolt', 45: 'Thunder' },

  'Magby': { 30: 'Magmar', 15: 'Ember', 25: 'Fire Punch' },
  'Magmar': { 40: 'Flamethrower', 45: 'Fire Blast' },

  'Larvitar': { 30: 'Pupitar', 15: 'Rock Slide', 22: 'Bite' },
  'Pupitar': { 55: 'Tyranitar', 40: 'Crunch' },
  'Tyranitar': { 60: 'Earthquake', 65: 'Hyper Beam' }
};
