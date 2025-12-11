
const EVOLUTIONS = {
  // --- KANTO (GEN 1) ---
  'Bulbasaur': { 16: 'Ivysaur', 10: 'Vine Whip', 25: 'Razor Leaf' },
  'Ivysaur': { 32: 'Venusaur', 22: 'Razor Leaf' },
  'Venusaur': { 45: 'Solar Beam' },
  
  'Charmander': { 16: 'Charmeleon', 10: 'Ember', 25: 'Flamethrower' },
  'Charmeleon': { 36: 'Charizard', 30: 'Flamethrower' },
  'Charizard': { 40: 'Wing Attack', 50: 'Fire Blast' },

  'Squirtle': { 16: 'Wartortle', 10: 'Water Gun', 25: 'Bite' },
  'Wartortle': { 36: 'Blastoise', 30: 'Ice Beam' }, // Simplificado
  'Blastoise': { 45: 'Hydro Pump' },

  'Pidgey': { 18: 'Pidgeotto', 12: 'Quick Attack', 20: 'Wing Attack' },
  'Pidgeotto': { 36: 'Pidgeot', 25: 'Wing Attack' },
  'Pidgeot': { 40: 'Fly' },

  'Rattata': { 20: 'Raticate', 10: 'Quick Attack', 15: 'Hyper Fang' },
  'Pikachu': { 22: 'Raichu', 10: 'Thunder Shock', 26: 'Thunderbolt' },
  
  'Zubat': { 22: 'Golbat', 15: 'Bite' },
  'Golbat': { 35: 'Crobat', 25: 'Wing Attack' }, // Evolución Cross-Gen

  'Oddish': { 21: 'Gloom', 15: 'Poison Powder' },
  'Gloom': { 30: 'Vileplume' }, // Piedra Hoja simplificada

  'Mankey': { 28: 'Primeape', 15: 'Karate Chop' },
  'Poliwag': { 25: 'Poliwhirl', 15: 'Water Gun' },
  'Poliwhirl': { 35: 'Poliwrath', 30: 'Body Slam' },

  'Abra': { 16: 'Kadabra' },
  'Kadabra': { 36: 'Alakazam', 20: 'Psychic', 25: 'Recover' },
  
  'Machop': { 28: 'Machoke', 20: 'Karate Chop' },
  'Machoke': { 40: 'Machamp', 35: 'Cross Chop' },

  'Geodude': { 25: 'Graveler', 15: 'Rock Throw' },
  'Graveler': { 40: 'Golem', 30: 'Earthquake' },

  'Gastly': { 25: 'Haunter', 15: 'Lick' },
  'Haunter': { 40: 'Gengar', 25: 'Shadow Ball' },

  'Onix': { 40: 'Steelix', 20: 'Rock Throw', 30: 'Iron Tail' }, // Evolución Cross-Gen

  'Eevee': { 25: 'Vaporeon', 26: 'Jolteon', 27: 'Flareon', 28: 'Espeon', 29: 'Umbreon', 10: 'Quick Attack' }, // Niveles arbitrarios para diferenciar

  'Scyther': { 40: 'Scizor', 20: 'Wing Attack', 30: 'Slash' }, // Evolución Cross-Gen
  'Magikarp': { 20: 'Gyarados', 15: 'Tackle' },
  'Gyarados': { 25: 'Bite', 35: 'Hydro Pump' },

  'Dratini': { 30: 'Dragonair', 20: 'Dragon Rage' },
  'Dragonair': { 55: 'Dragonite', 40: 'Dragon Breath' },
  'Dragonite': { 60: 'Outrage' },

  // --- JOHTO (GEN 2) ---
  'Chikorita': { 16: 'Bayleef', 10: 'Razor Leaf', 15: 'Poison Powder' },
  'Bayleef': { 32: 'Meganium', 20: 'Reflect', 30: 'Body Slam' },
  'Meganium': { 40: 'Solar Beam' },

  'Cyndaquil': { 14: 'Quilava', 12: 'Ember', 20: 'Quick Attack' },
  'Quilava': { 36: 'Typhlosion', 30: 'Flame Wheel' },
  'Typhlosion': { 45: 'Flamethrower' },

  'Totodile': { 18: 'Croconaw', 13: 'Water Gun', 20: 'Bite' },
  'Croconaw': { 30: 'Feraligatr', 25: 'Ice Fang' },
  'Feraligatr': { 40: 'Hydro Pump', 45: 'Slash' },

  'Sentret': { 15: 'Furret', 10: 'Quick Attack' },
  'Hoothoot': { 20: 'Noctowl', 15: 'Peck' },
  'Ledyba': { 18: 'Ledian', 12: 'Comet Punch' },
  'Spinarak': { 22: 'Ariados', 12: 'Poison Sting' },
  
  'Mareep': { 15: 'Flaaffy', 10: 'Thunder Shock' },
  'Flaaffy': { 30: 'Ampharos', 20: 'Thunder Punch' },
  'Ampharos': { 40: 'Thunder' },

  'Marill': { 18: 'Azumarill', 10: 'Water Gun', 15: 'Bubble Beam' },
  'Wooper': { 20: 'Quagsire', 15: 'Water Gun' },
  'Quagsire': { 25: 'Earthquake' },

  'Snubbull': { 23: 'Granbull', 15: 'Bite' },
  'Teddiursa': { 30: 'Ursaring', 15: 'Scratch', 25: 'Faint Attack' },
  
  'Houndour': { 24: 'Houndoom', 15: 'Ember', 20: 'Bite' },
  'Houndoom': { 35: 'Crunch', 45: 'Flamethrower' },

  'Phanpy': { 25: 'Donphan', 15: 'Rollout' },
  'Donphan': { 35: 'Earthquake' },

  'Larvitar': { 30: 'Pupitar', 15: 'Rock Slide', 22: 'Bite' },
  'Pupitar': { 55: 'Tyranitar', 40: 'Crunch' },
  'Tyranitar': { 60: 'Earthquake', 65: 'Hyper Beam' }
};