const MOVES = {
  'Struggle': { nombre: 'Combate', poder: 50, tipo: 'Normal', cat: 'Fis', alwaysHit: true, emergency: true },
  'Recharge': { nombre: 'Recargar', poder: 0, tipo: 'Normal', cat: 'Est', internalAction: true },
  // --- NORMAL ---
  'Tackle': { nombre: 'Placaje', poder: 40, tipo: 'Normal', cat: 'Fis' },
  'Scratch': { nombre: 'Arañazo', poder: 40, tipo: 'Normal', cat: 'Fis' },
  'Quick Attack': { nombre: 'Ataque Rápido', poder: 40, tipo: 'Normal', cat: 'Fis' },
  'Cut': { nombre: 'Corte', poder: 50, tipo: 'Normal', cat: 'Fis' },
  'Headbutt': { nombre: 'Golpe Cabeza', poder: 70, tipo: 'Normal', cat: 'Fis', effect: 'FLI', chance: 0.3 },
  'Body Slam': { nombre: 'Golpe Cuerpo', poder: 85, tipo: 'Normal', cat: 'Fis', effect: 'PAR', chance: 0.3 },
  'Slash': { nombre: 'Cuchillada', poder: 70, tipo: 'Normal', cat: 'Fis' }, // Alta prob critico
  'Double-Edge': { nombre: 'Doble Filo', poder: 120, tipo: 'Normal', cat: 'Fis', recoil: 0.33 },
  'Hyper Beam': { nombre: 'Hiperrayo', poder: 150, tipo: 'Normal', cat: 'Esp', rechargeTurns: 1 },
  'Tri Attack': { nombre: 'Triataque', poder: 80, tipo: 'Normal', cat: 'Esp', effect: 'PAR|BRN|FRZ', chance: 0.2 },
  'Extreme Speed': { nombre: 'Velocidad Extrema', poder: 80, tipo: 'Normal', cat: 'Fis' },

  // --- FUEGO ---
  'Ember': { nombre: 'Ascuas', poder: 40, tipo: 'Fuego', cat: 'Esp', effect: 'BRN', chance: 0.1 },
  'Flamethrower': { nombre: 'Lanzallamas', poder: 90, tipo: 'Fuego', cat: 'Esp', effect: 'BRN', chance: 0.1 },
  'Fire Punch': { nombre: 'Puño Fuego', poder: 75, tipo: 'Fuego', cat: 'Fis', effect: 'BRN', chance: 0.1 },
  'Fire Blast': { nombre: 'Llamarada', poder: 110, tipo: 'Fuego', cat: 'Esp', accuracy: 0.85, effect: 'BRN', chance: 0.1 },
  'Flame Wheel': { nombre: 'Rueda Fuego', poder: 60, tipo: 'Fuego', cat: 'Fis', effect: 'BRN', chance: 0.1 },
  'Sacred Fire': { nombre: 'Fuego Sagrado', poder: 100, tipo: 'Fuego', cat: 'Fis', effect: 'BRN', chance: 0.5 },

  // --- AGUA ---
  'Water Gun': { nombre: 'Pistola Agua', poder: 40, tipo: 'Agua', cat: 'Esp' },
  'Surf': { nombre: 'Surf', poder: 90, tipo: 'Agua', cat: 'Esp' },
  'Bubble Beam': { nombre: 'Rayo Burbuja', poder: 65, tipo: 'Agua', cat: 'Esp', effect: 'SPD_DOWN', chance: 0.1 },
  'Hydro Pump': { nombre: 'Hidrobomba', poder: 110, tipo: 'Agua', cat: 'Esp', accuracy: 0.8 },
  'Waterfall': { nombre: 'Cascada', poder: 80, tipo: 'Agua', cat: 'Fis', effect: 'FLI', chance: 0.2 },

  // --- PLANTA ---
  'Vine Whip': { nombre: 'Látigo Cepa', poder: 45, tipo: 'Planta', cat: 'Fis' },
  'Razor Leaf': { nombre: 'Hoja Afilada', poder: 55, tipo: 'Planta', cat: 'Fis' }, // Alta prob critico
  'Solar Beam': { nombre: 'Rayo Solar', poder: 120, tipo: 'Planta', cat: 'Esp', chargeTurns: 1, skipChargeWeather: 'SUN' },
  'Giga Drain': { nombre: 'Gigadrenado', poder: 75, tipo: 'Planta', cat: 'Esp', drain: 0.5 },
  'Petal Dance': { nombre: 'Danza Pétalo', poder: 120, tipo: 'Planta', cat: 'Esp' },

  // --- ELÉCTRICO ---
  'Thunder Shock': { nombre: 'Impactrueno', poder: 40, tipo: 'Eléctrico', cat: 'Esp', effect: 'PAR', chance: 0.1 },
  'Thunderbolt': { nombre: 'Rayo', poder: 90, tipo: 'Eléctrico', cat: 'Esp', effect: 'PAR', chance: 0.1 },
  'Thunder Punch': { nombre: 'Puño Trueno', poder: 75, tipo: 'Eléctrico', cat: 'Fis', effect: 'PAR', chance: 0.1 },
  'Thunder': { nombre: 'Trueno', poder: 110, tipo: 'Eléctrico', cat: 'Esp', accuracy: 0.7, effect: 'PAR', chance: 0.3 },
  'Spark': { nombre: 'Chispa', poder: 65, tipo: 'Eléctrico', cat: 'Fis', effect: 'PAR', chance: 0.3 },
  'Zap Cannon': { nombre: 'Electrocañón', poder: 120, tipo: 'Eléctrico', cat: 'Esp', accuracy: 0.5, effect: 'PAR', chance: 1.0 },

  // --- HIELO ---
  'Ice Beam': { nombre: 'Rayo Hielo', poder: 90, tipo: 'Hielo', cat: 'Esp', effect: 'FRZ', chance: 0.1 },
  'Ice Punch': { nombre: 'Puño Hielo', poder: 75, tipo: 'Hielo', cat: 'Fis', effect: 'FRZ', chance: 0.1 },
  'Blizzard': { nombre: 'Ventisca', poder: 110, tipo: 'Hielo', cat: 'Esp', accuracy: 0.7, effect: 'FRZ', chance: 0.1 },
  'Icy Wind': { nombre: 'Viento Hielo', poder: 55, tipo: 'Hielo', cat: 'Esp', effect: 'SPD_DOWN', chance: 1.0 },

  // --- LUCHA ---
  'Karate Chop': { nombre: 'Golpe Karate', poder: 50, tipo: 'Lucha', cat: 'Fis' }, // En Gen2 cambia a Lucha
  'Mach Punch': { nombre: 'Ultrapuño', poder: 40, tipo: 'Lucha', cat: 'Fis' },
  'Cross Chop': { nombre: 'Tajo Cruzado', poder: 100, tipo: 'Lucha', cat: 'Fis' },
  'Dynamic Punch': { nombre: 'Puño Dinámico', poder: 100, tipo: 'Lucha', cat: 'Fis', accuracy: 0.5, effect: 'CON', chance: 1.0 },
  'Reversal': { nombre: 'Inversión', poder: 20, tipo: 'Lucha', cat: 'Fis', variablePower: 'LOW_HP' },
  
  // --- VENENO ---
  'Poison Sting': { nombre: 'Picotazo Ven', poder: 15, tipo: 'Veneno', cat: 'Fis', effect: 'PSN', chance: 0.3 },
  'Sludge Bomb': { nombre: 'Bomba Lodo', poder: 90, tipo: 'Veneno', cat: 'Esp', effect: 'PSN', chance: 0.3 },
  
  // --- TIERRA ---
  'Earthquake': { nombre: 'Terremoto', poder: 100, tipo: 'Tierra', cat: 'Fis' },
  'Dig': { nombre: 'Excavar', poder: 80, tipo: 'Tierra', cat: 'Fis', chargeTurns: 1 },
  'Mud-Slap': { nombre: 'Bofetón Lodo', poder: 20, tipo: 'Tierra', cat: 'Esp', effect: 'ACC_DOWN', chance: 1.0 },
  'Bonemerang': { nombre: 'Huesomerang', poder: 50, tipo: 'Tierra', cat: 'Fis' }, // Golpea 2 veces
  
  // --- VOLADOR ---
  'Wing Attack': { nombre: 'Ataque Ala', poder: 60, tipo: 'Volador', cat: 'Fis' },
  'Peck': { nombre: 'Picotazo', poder: 35, tipo: 'Volador', cat: 'Fis' },
  'Fly': { nombre: 'Vuelo', poder: 90, tipo: 'Volador', cat: 'Fis', chargeTurns: 1 },
  'Drill Peck': { nombre: 'Pico Taladro', poder: 80, tipo: 'Volador', cat: 'Fis' },
  'Aeroblast': { nombre: 'Aerochorro', poder: 100, tipo: 'Volador', cat: 'Esp' },

  // --- PSÍQUICO ---
  'Psychic': { nombre: 'Psíquico', poder: 90, tipo: 'Psíquico', cat: 'Esp', effect: 'SPDEF_DOWN', chance: 0.1 },
  'Confusion': { nombre: 'Confusión', poder: 50, tipo: 'Psíquico', cat: 'Esp', effect: 'CON', chance: 0.1 },
  'Psybeam': { nombre: 'Psicorrayo', poder: 65, tipo: 'Psíquico', cat: 'Esp', effect: 'CON', chance: 0.1 },
  'Dream Eater': { nombre: 'Comesueños', poder: 100, tipo: 'Psíquico', cat: 'Esp' }, // Solo dormidos

  // --- BICHO ---
  'Megahorn': { nombre: 'Megacuerno', poder: 120, tipo: 'Bicho', cat: 'Fis' },
  'Pin Missile': { nombre: 'Pin Misil', poder: 25, tipo: 'Bicho', cat: 'Fis', multiHit: { min: 2, max: 5 } },
  'Fury Cutter': { nombre: 'Corte Furia', poder: 40, tipo: 'Bicho', cat: 'Fis', chainPower: { multiplier: 2, maxStacks: 4 } },

  // --- ROCA ---
  'Rock Throw': { nombre: 'Lanzarrocas', poder: 50, tipo: 'Roca', cat: 'Fis' },
  'Rock Slide': { nombre: 'Avalancha', poder: 75, tipo: 'Roca', cat: 'Fis', effect: 'FLI', chance: 0.3 },
  'Ancient Power': { nombre: 'Poder Pasado', poder: 60, tipo: 'Roca', cat: 'Esp', effect: 'ALL_UP', chance: 0.1 },
  'Rollout': { nombre: 'Desenrollar', poder: 30, tipo: 'Roca', cat: 'Fis', accuracy: 0.9, chainPower: { multiplier: 2, maxStacks: 5 } },

  // --- FANTASMA ---
  'Lick': { nombre: 'Lengüetazo', poder: 30, tipo: 'Fantasma', cat: 'Fis', effect: 'PAR', chance: 0.3 },
  'Shadow Ball': { nombre: 'Bola Sombra', poder: 80, tipo: 'Fantasma', cat: 'Esp', effect: 'SPDEF_DOWN', chance: 0.2 },
  
  // --- DRAGÓN ---
  'Dragon Rage': { nombre: 'Furia Dragón', poder: 0, tipo: 'Dragón', cat: 'Esp', fixedDamage: 40 }, // Daño fijo 40
  'Dragon Breath': { nombre: 'Dragoaliento', poder: 60, tipo: 'Dragón', cat: 'Esp', effect: 'PAR', chance: 0.3 },
  'Outrage': { nombre: 'Enfado', poder: 120, tipo: 'Dragón', cat: 'Fis', effect: 'SELF_CON', chance: 1.0 }, // Confusión propia simplificada

  // --- ACERO (NUEVO GEN 2) ---
  'Steel Wing': { nombre: 'Ala de Acero', poder: 70, tipo: 'Acero', cat: 'Fis', effect: 'DEF_UP', chance: 0.1 },
  'Iron Tail': { nombre: 'Cola Férrea', poder: 100, tipo: 'Acero', cat: 'Fis', effect: 'DEF_DOWN', chance: 0.3 },
  'Metal Claw': { nombre: 'Garra Metal', poder: 50, tipo: 'Acero', cat: 'Fis', effect: 'ATK_UP', chance: 0.1 },

  // --- SINIESTRO (NUEVO GEN 2) ---
  'Bite': { nombre: 'Mordisco', poder: 60, tipo: 'Siniestro', cat: 'Fis', effect: 'FLI', chance: 0.3 }, // Cambiado a Siniestro
  'Crunch': { nombre: 'Triturar', poder: 80, tipo: 'Siniestro', cat: 'Fis', effect: 'DEF_DOWN', chance: 0.2 },
  'Faint Attack': { nombre: 'Finta', poder: 60, tipo: 'Siniestro', cat: 'Fis', alwaysHit: true }, // Infalible
  'Thief': { nombre: 'Ladrón', poder: 60, tipo: 'Siniestro', cat: 'Fis' },
  'Pursuit': { nombre: 'Persecución', poder: 40, tipo: 'Siniestro', cat: 'Fis' },
  'U-turn': { nombre: 'Ida y Vuelta', poder: 70, tipo: 'Bicho', cat: 'Fis', effect: 'PIVOT_SWITCH', cooldown: 1 },
  'Volt Switch': { nombre: 'Voltiocambio', poder: 70, tipo: 'Eléctrico', cat: 'Esp', effect: 'PIVOT_SWITCH', cooldown: 1 }
,

  // --- CATÁLOGO COMPLEMENTARIO (semánticas compatibles con el motor actual) ---
  'Absorb': { nombre: 'Absorber', poder: 20, tipo: 'Planta', cat: 'Esp', drain: 0.5 },
  'Acid': { nombre: 'Ácido', poder: 40, tipo: 'Veneno', cat: 'Esp', effect: 'DEF_DOWN', chance: 0.1 },
  'Aurora Beam': { nombre: 'Rayo Aurora', poder: 65, tipo: 'Hielo', cat: 'Esp', effect: 'ATK_DOWN', chance: 0.1 },
  'Barrage': { nombre: 'Presa', poder: 15, tipo: 'Normal', cat: 'Fis', multiHit: { min: 2, max: 5 } },
  'Bind': { nombre: 'Atadura', poder: 15, tipo: 'Normal', cat: 'Fis' },
  'Bone Club': { nombre: 'Hueso Palo', poder: 65, tipo: 'Tierra', cat: 'Fis' },
  'Brave Bird': { nombre: 'Pájaro Osado', poder: 120, tipo: 'Volador', cat: 'Fis', recoil: 0.33 },
  'Bubble': { nombre: 'Burbuja', poder: 40, tipo: 'Agua', cat: 'Esp', effect: 'SPD_DOWN', chance: 0.1 },
  'Clamp': { nombre: 'Tenaza', poder: 35, tipo: 'Agua', cat: 'Fis' },
  'Comet Punch': { nombre: 'Puño Cometa', poder: 18, tipo: 'Normal', cat: 'Fis', multiHit: { min: 2, max: 5 } },
  'Constrict': { nombre: 'Restricción', poder: 10, tipo: 'Normal', cat: 'Fis', effect: 'SPD_DOWN', chance: 0.1 },
  'Counter': { nombre: 'Contraataque', poder: 60, tipo: 'Lucha', cat: 'Fis' },
  'Crabhammer': { nombre: 'Martillazo', poder: 100, tipo: 'Agua', cat: 'Fis' },
  'Dark Pulse': { nombre: 'Pulso Umbrío', poder: 80, tipo: 'Siniestro', cat: 'Esp', effect: 'FLI', chance: 0.2 },
  'Double Kick': { nombre: 'Doble Patada', poder: 30, tipo: 'Lucha', cat: 'Fis', multiHit: { min: 2, max: 2 } },
  'Explosion': { nombre: 'Explosión', poder: 250, tipo: 'Normal', cat: 'Fis', hpCost: 0.99 },
  'Fury Attack': { nombre: 'Ataque Furia', poder: 15, tipo: 'Normal', cat: 'Fis', multiHit: { min: 2, max: 5 } },
  'Fury Swipes': { nombre: 'Golpes Furia', poder: 18, tipo: 'Normal', cat: 'Fis', multiHit: { min: 2, max: 5 } },
  'Gust': { nombre: 'Tornado', poder: 40, tipo: 'Volador', cat: 'Esp' },
  'Hidden Power': { nombre: 'Poder Oculto', poder: 60, tipo: 'Normal', cat: 'Esp' },
  'High Jump Kick': { nombre: 'Patada Salto Alta', poder: 130, tipo: 'Lucha', cat: 'Fis', accuracy: 0.9 },
  'Horn Attack': { nombre: 'Cornada', poder: 65, tipo: 'Normal', cat: 'Fis' },
  'Horn Drill': { nombre: 'Perforador', poder: 0, tipo: 'Normal', cat: 'Fis', accuracy: 0.3, ohko: true },
  'Hyper Fang': { nombre: 'Hipercolmillo', poder: 80, tipo: 'Normal', cat: 'Fis', effect: 'FLI', chance: 0.1 },
  'Leech Life': { nombre: 'Chupavidas', poder: 80, tipo: 'Bicho', cat: 'Fis', drain: 0.5 },
  'Low Kick': { nombre: 'Patada Baja', poder: 60, tipo: 'Lucha', cat: 'Fis' },
  'Mega Drain': { nombre: 'Megaagotar', poder: 40, tipo: 'Planta', cat: 'Esp', drain: 0.5 },
  'Mega Punch': { nombre: 'Megapuño', poder: 80, tipo: 'Normal', cat: 'Fis', accuracy: 0.85 },
  'Mirror Coat': { nombre: 'Manto Espejo', poder: 80, tipo: 'Psíquico', cat: 'Esp' },
  'Night Shade': { nombre: 'Tinieblas', poder: 0, tipo: 'Fantasma', cat: 'Esp', fixedDamage: 40 },
  'Octazooka': { nombre: 'Octazooka', poder: 65, tipo: 'Agua', cat: 'Esp', effect: 'ACC_DOWN', chance: 0.5 },
  'Pound': { nombre: 'Destructor', poder: 40, tipo: 'Normal', cat: 'Fis' },
  'Powder Snow': { nombre: 'Nieve Polvo', poder: 40, tipo: 'Hielo', cat: 'Esp', effect: 'FRZ', chance: 0.1 },
  'Present': { nombre: 'Presente', poder: 70, tipo: 'Normal', cat: 'Fis' },
  'Rolling Kick': { nombre: 'Patada Giro', poder: 60, tipo: 'Lucha', cat: 'Fis', effect: 'FLI', chance: 0.3 },
  'Seismic Toss': { nombre: 'Movimiento Sísmico', poder: 0, tipo: 'Lucha', cat: 'Fis', fixedDamage: 50 },
  'Self-Destruct': { nombre: 'Autodestrucción', poder: 200, tipo: 'Normal', cat: 'Fis', hpCost: 0.99 },
  'Sky Attack': { nombre: 'Ataque Aéreo', poder: 140, tipo: 'Volador', cat: 'Fis', accuracy: 0.9, chargeTurns: 1 },
  'Slam': { nombre: 'Atizar', poder: 80, tipo: 'Normal', cat: 'Fis', accuracy: 0.75 },
  'Sludge': { nombre: 'Residuos', poder: 65, tipo: 'Veneno', cat: 'Esp', effect: 'PSN', chance: 0.3 },
  'Smog': { nombre: 'Polución', poder: 30, tipo: 'Veneno', cat: 'Esp', effect: 'PSN', chance: 0.4 },
  'Sonic Boom': { nombre: 'Bomba Sónica', poder: 0, tipo: 'Normal', cat: 'Esp', fixedDamage: 20 },
  'Spike Cannon': { nombre: 'Clavo Cañón', poder: 20, tipo: 'Normal', cat: 'Fis', multiHit: { min: 2, max: 5 } },
  'Stomp': { nombre: 'Pisotón', poder: 65, tipo: 'Normal', cat: 'Fis', effect: 'FLI', chance: 0.3 },
  'Submission': { nombre: 'Sumisión', poder: 80, tipo: 'Lucha', cat: 'Fis', accuracy: 0.8, recoil: 0.25 },
  'Take Down': { nombre: 'Derribo', poder: 90, tipo: 'Normal', cat: 'Fis', accuracy: 0.85, recoil: 0.25 },
  'Thrash': { nombre: 'Golpe', poder: 120, tipo: 'Normal', cat: 'Fis' },
  'Twineedle': { nombre: 'Doble Ataque', poder: 25, tipo: 'Bicho', cat: 'Fis', multiHit: { min: 2, max: 2 }, effect: 'PSN', chance: 0.2 },
  'Twister': { nombre: 'Ciclón', poder: 40, tipo: 'Dragón', cat: 'Esp', effect: 'FLI', chance: 0.2 },
  'Vice Grip': { nombre: 'Agarre', poder: 55, tipo: 'Normal', cat: 'Fis' },
  'Wrap': { nombre: 'Constricción', poder: 15, tipo: 'Normal', cat: 'Fis' },

  // --- ESTADO / SOPORTE ---
  'Barrier': { nombre: 'Barrera', poder: 0, tipo: 'Psíquico', cat: 'Est', effects: [{ type: 'stat', target: 'self', stat: 'def', change: 2 }] },
  'Conversion': { nombre: 'Conversión', poder: 0, tipo: 'Normal', cat: 'Est', effect: 'DEF_UP' },
  'Conversion 2': { nombre: 'Conversión 2', poder: 0, tipo: 'Normal', cat: 'Est', effect: 'SPDEF_UP' },
  'Cotton Spore': { nombre: 'Esporagodón', poder: 0, tipo: 'Planta', cat: 'Est', effects: [{ type: 'stat', target: 'foe', stat: 'spe', change: -2 }] },
  'Lovely Kiss': { nombre: 'Beso Amoroso', poder: 0, tipo: 'Normal', cat: 'Est', accuracy: 0.75, effect: 'SLP', cooldown: 3 },
  'Metronome': { nombre: 'Metrónomo', poder: 0, tipo: 'Normal', cat: 'Est', randomMove: true, cooldown: 2 },
  'Pain Split': { nombre: 'Divide Dolor', poder: 0, tipo: 'Normal', cat: 'Est', effect: 'HEAL_50', cooldown: 3 },
  'Sketch': { nombre: 'Esquema', poder: 0, tipo: 'Normal', cat: 'Est', effect: 'SKETCH', cooldown: 2 },
  'Stun Spore': { nombre: 'Paralizador', poder: 0, tipo: 'Planta', cat: 'Est', accuracy: 0.75, effect: 'PAR', cooldown: 2 },
  'Supersonic': { nombre: 'Supersónico', poder: 0, tipo: 'Normal', cat: 'Est', accuracy: 0.55, effect: 'CON', cooldown: 2 },
  'Sweet Kiss': { nombre: 'Dulce Beso', poder: 0, tipo: 'Normal', cat: 'Est', accuracy: 0.75, effect: 'CON', cooldown: 2 },
  'Toxic': { nombre: 'Tóxico', poder: 0, tipo: 'Veneno', cat: 'Est', accuracy: 0.9, effect: 'PSN', cooldown: 2 },
  'Transform': { nombre: 'Transformación', poder: 0, tipo: 'Normal', cat: 'Est', effect: 'TRANSFORM', cooldown: 2 },
  'Harden': { nombre: 'Fortaleza', poder: 0, tipo: 'Normal', cat: 'Est', effect: 'DEF_UP' },
  'Sand Attack': { nombre: 'Ataque Arena', poder: 0, tipo: 'Tierra', cat: 'Est', effect: 'ACC_DOWN' },
  'Sing': { nombre: 'Canto', poder: 0, tipo: 'Normal', cat: 'Est', accuracy: 0.55, effect: 'SLP', cooldown: 3 },
  'Hypnosis': { nombre: 'Hipnosis', poder: 0, tipo: 'Psíquico', cat: 'Est', accuracy: 0.6, effect: 'SLP', cooldown: 3 },
  'Thunder Wave': { nombre: 'Onda Trueno', poder: 0, tipo: 'Eléctrico', cat: 'Est', accuracy: 0.9, effect: 'PAR', cooldown: 2 },
  'Recover': { nombre: 'Recuperacion', poder: 0, tipo: 'Normal', cat: 'Est', effect: 'HEAL_50', cooldown: 3 },
  'Soft-Boiled': { nombre: 'Amortiguador', poder: 0, tipo: 'Normal', cat: 'Est', effect: 'HEAL_50', cooldown: 3 },
  'Milk Drink': { nombre: 'Batido', poder: 0, tipo: 'Normal', cat: 'Est', effect: 'HEAL_50', cooldown: 3 },
  'Moonlight': { nombre: 'Luz Lunar', poder: 0, tipo: 'Normal', cat: 'Est', effect: 'HEAL_50', cooldown: 3 },
  'Morning Sun': { nombre: 'Sol Matinal', poder: 0, tipo: 'Normal', cat: 'Est', effect: 'HEAL_50', cooldown: 3 },
  'Synthesis': { nombre: 'Sintesis', poder: 0, tipo: 'Planta', cat: 'Est', effect: 'HEAL_50', cooldown: 3 },
  'Rest': { nombre: 'Descanso', poder: 0, tipo: 'Psíquico', cat: 'Est', effect: 'REST', cooldown: 4 },
  'Agility': { nombre: 'Agilidad', poder: 0, tipo: 'Psíquico', cat: 'Est', effects: [{ type: 'stat', target: 'self', stat: 'spe', change: 2 }] },
  'Baton Pass': { nombre: 'Relevo', poder: 0, tipo: 'Normal', cat: 'Est', effect: 'BATON_PASS', cooldown: 2 },
  'Swords Dance': { nombre: 'Danza Espada', poder: 0, tipo: 'Normal', cat: 'Est', effects: [{ type: 'stat', target: 'self', stat: 'atk', change: 2 }] },
  'Growth': { nombre: 'Desarrollo', poder: 0, tipo: 'Normal', cat: 'Est', effects: [{ type: 'stat', target: 'self', stat: 'atk', change: 1 }, { type: 'stat', target: 'self', stat: 'spa', change: 1 }] },
  'Acid Armor': { nombre: 'Armadura Acida', poder: 0, tipo: 'Veneno', cat: 'Est', effects: [{ type: 'stat', target: 'self', stat: 'def', change: 2 }] },
  'Withdraw': { nombre: 'Refugio', poder: 0, tipo: 'Agua', cat: 'Est', effect: 'DEF_UP' },
  'Rapid Spin': { nombre: 'Giro Rapido', poder: 50, tipo: 'Normal', cat: 'Fis', effect: 'CLEAR_OWN_HAZARDS', cooldown: 1 },
  'Reflect': { nombre: 'Reflejo', poder: 0, tipo: 'Psíquico', cat: 'Est', effect: 'REFLECT', cooldown: 3 },
  'Defog': { nombre: 'Despejar', poder: 0, tipo: 'Volador', cat: 'Est', effect: 'DEFOG', cooldown: 2 },
  'Haze': { nombre: 'Niebla', poder: 0, tipo: 'Hielo', cat: 'Est', effect: 'HAZE', cooldown: 2 },
  'Light Screen': { nombre: 'Pantalla Luz', poder: 0, tipo: 'Psíquico', cat: 'Est', effect: 'LIGHT_SCREEN', cooldown: 3 },
  'Heal Block': { nombre: 'Anticura', poder: 0, tipo: 'Psíquico', cat: 'Est', accuracy: 0.95, effect: 'HEAL_BLOCK', cooldown: 3 },
  'Disable': { nombre: 'Anulacion', poder: 0, tipo: 'Normal', cat: 'Est', accuracy: 1, effect: 'DISABLE', cooldown: 2 },
  'Leech Seed': { nombre: 'Drenadoras', poder: 0, tipo: 'Planta', cat: 'Est', accuracy: 0.9, effect: 'LEECH_SEED', cooldown: 2 },
  'Spikes': { nombre: 'Púas', poder: 0, tipo: 'Tierra', cat: 'Est', effect: 'SPIKES', cooldown: 2 },
  'Toxic Spikes': { nombre: 'Púas Tóxicas', poder: 0, tipo: 'Veneno', cat: 'Est', effect: 'TOXIC_SPIKES', cooldown: 2 },
  'Stealth Rock': { nombre: 'Trampa Rocas', poder: 0, tipo: 'Roca', cat: 'Est', effect: 'STEALTH_ROCK', cooldown: 2 },
  'Charm': { nombre: 'Encanto', poder: 0, tipo: 'Normal', cat: 'Est', effects: [{ type: 'stat', target: 'foe', stat: 'atk', change: -2 }] },
  'Confuse Ray': { nombre: 'Rayo Confuso', poder: 0, tipo: 'Fantasma', cat: 'Est', accuracy: 0.85, effect: 'CON', cooldown: 2 },
  'Spore': { nombre: 'Espora', poder: 0, tipo: 'Planta', cat: 'Est', accuracy: 1, effect: 'SLP', cooldown: 4 },
  'Glare': { nombre: 'Deslumbrar', poder: 0, tipo: 'Normal', cat: 'Est', accuracy: 0.9, effect: 'PAR', cooldown: 2 },
  'Taunt': { nombre: 'Mofa', poder: 0, tipo: 'Siniestro', cat: 'Est', accuracy: 1, effect: 'TAUNT', cooldown: 2 },
  'Protect': { nombre: 'Proteccion', poder: 0, tipo: 'Normal', cat: 'Est', effect: 'PROTECT', cooldown: 1 },
  'Perish Song': { nombre: 'Canto Mortal', poder: 0, tipo: 'Normal', cat: 'Est', effect: 'PERISH_SONG', cooldown: 4 },
  'Rain Dance': { nombre: 'Danza Lluvia', poder: 0, tipo: 'Agua', cat: 'Est', effect: 'RAIN', cooldown: 3 },
  'Sunny Day': { nombre: 'Día Soleado', poder: 0, tipo: 'Fuego', cat: 'Est', effect: 'SUN', cooldown: 3 },
  'Sandstorm': { nombre: 'Tormenta Arena', poder: 0, tipo: 'Roca', cat: 'Est', effect: 'SAND', cooldown: 3 },
  'Hail': { nombre: 'Granizo', poder: 0, tipo: 'Hielo', cat: 'Est', effect: 'HAIL', cooldown: 3 },
  'Teleport': { nombre: 'Teletransporte', poder: 0, tipo: 'Psíquico', cat: 'Est', effect: 'EVA_UP' },
  'Splash': { nombre: 'Salpicadura', poder: 0, tipo: 'Agua', cat: 'Est' }
};

