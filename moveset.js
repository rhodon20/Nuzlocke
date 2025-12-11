const MOVES = {
  // --- NORMAL ---
  'Tackle': { nombre: 'Placaje', poder: 40, tipo: 'Normal', cat: 'Fis' },
  'Scratch': { nombre: 'Arañazo', poder: 40, tipo: 'Normal', cat: 'Fis' },
  'Quick Attack': { nombre: 'Ataque Rápido', poder: 40, tipo: 'Normal', cat: 'Fis' },
  'Cut': { nombre: 'Corte', poder: 50, tipo: 'Normal', cat: 'Fis' },
  'Headbutt': { nombre: 'Golpe Cabeza', poder: 70, tipo: 'Normal', cat: 'Fis', effect: 'FLI', chance: 0.3 },
  'Body Slam': { nombre: 'Golpe Cuerpo', poder: 85, tipo: 'Normal', cat: 'Fis', effect: 'PAR', chance: 0.3 },
  'Slash': { nombre: 'Cuchillada', poder: 70, tipo: 'Normal', cat: 'Fis' }, // Alta prob critico
  'Double-Edge': { nombre: 'Doble Filo', poder: 120, tipo: 'Normal', cat: 'Fis' }, // Tiene recoil
  'Hyper Beam': { nombre: 'Hiperrayo', poder: 150, tipo: 'Normal', cat: 'Esp' },
  'Tri Attack': { nombre: 'Triataque', poder: 80, tipo: 'Normal', cat: 'Esp', effect: 'PAR|BRN|FRZ', chance: 0.2 },
  'Extreme Speed': { nombre: 'Velocidad Extrema', poder: 80, tipo: 'Normal', cat: 'Fis' },

  // --- FUEGO ---
  'Ember': { nombre: 'Ascuas', poder: 40, tipo: 'Fuego', cat: 'Esp', effect: 'BRN', chance: 0.1 },
  'Flamethrower': { nombre: 'Lanzallamas', poder: 90, tipo: 'Fuego', cat: 'Esp', effect: 'BRN', chance: 0.1 },
  'Fire Punch': { nombre: 'Puño Fuego', poder: 75, tipo: 'Fuego', cat: 'Fis', effect: 'BRN', chance: 0.1 },
  'Fire Blast': { nombre: 'Llamarada', poder: 110, tipo: 'Fuego', cat: 'Esp', effect: 'BRN', chance: 0.1 },
  'Flame Wheel': { nombre: 'Rueda Fuego', poder: 60, tipo: 'Fuego', cat: 'Fis', effect: 'BRN', chance: 0.1 },
  'Sacred Fire': { nombre: 'Fuego Sagrado', poder: 100, tipo: 'Fuego', cat: 'Fis', effect: 'BRN', chance: 0.5 },

  // --- AGUA ---
  'Water Gun': { nombre: 'Pistola Agua', poder: 40, tipo: 'Agua', cat: 'Esp' },
  'Surf': { nombre: 'Surf', poder: 90, tipo: 'Agua', cat: 'Esp' },
  'Bubble Beam': { nombre: 'Rayo Burbuja', poder: 65, tipo: 'Agua', cat: 'Esp', effect: 'SPD_DOWN', chance: 0.1 },
  'Hydro Pump': { nombre: 'Hidrobomba', poder: 110, tipo: 'Agua', cat: 'Esp' },
  'Waterfall': { nombre: 'Cascada', poder: 80, tipo: 'Agua', cat: 'Fis', effect: 'FLI', chance: 0.2 },

  // --- PLANTA ---
  'Vine Whip': { nombre: 'Látigo Cepa', poder: 45, tipo: 'Planta', cat: 'Fis' },
  'Razor Leaf': { nombre: 'Hoja Afilada', poder: 55, tipo: 'Planta', cat: 'Fis' }, // Alta prob critico
  'Solar Beam': { nombre: 'Rayo Solar', poder: 120, tipo: 'Planta', cat: 'Esp' }, // 2 turnos
  'Giga Drain': { nombre: 'Gigadrenado', poder: 75, tipo: 'Planta', cat: 'Esp' }, // Roba vida
  'Petal Dance': { nombre: 'Danza Pétalo', poder: 120, tipo: 'Planta', cat: 'Esp' },

  // --- ELÉCTRICO ---
  'Thunder Shock': { nombre: 'Impactrueno', poder: 40, tipo: 'Eléctrico', cat: 'Esp', effect: 'PAR', chance: 0.1 },
  'Thunderbolt': { nombre: 'Rayo', poder: 90, tipo: 'Eléctrico', cat: 'Esp', effect: 'PAR', chance: 0.1 },
  'Thunder Punch': { nombre: 'Puño Trueno', poder: 75, tipo: 'Eléctrico', cat: 'Fis', effect: 'PAR', chance: 0.1 },
  'Thunder': { nombre: 'Trueno', poder: 110, tipo: 'Eléctrico', cat: 'Esp', effect: 'PAR', chance: 0.3 },
  'Spark': { nombre: 'Chispa', poder: 65, tipo: 'Eléctrico', cat: 'Fis', effect: 'PAR', chance: 0.3 },
  'Zap Cannon': { nombre: 'Electrocañón', poder: 120, tipo: 'Eléctrico', cat: 'Esp', effect: 'PAR', chance: 1.0 },

  // --- HIELO ---
  'Ice Beam': { nombre: 'Rayo Hielo', poder: 90, tipo: 'Hielo', cat: 'Esp', effect: 'FRZ', chance: 0.1 },
  'Ice Punch': { nombre: 'Puño Hielo', poder: 75, tipo: 'Hielo', cat: 'Fis', effect: 'FRZ', chance: 0.1 },
  'Blizzard': { nombre: 'Ventisca', poder: 110, tipo: 'Hielo', cat: 'Esp', effect: 'FRZ', chance: 0.1 },
  'Icy Wind': { nombre: 'Viento Hielo', poder: 55, tipo: 'Hielo', cat: 'Esp', effect: 'SPD_DOWN', chance: 1.0 },

  // --- LUCHA ---
  'Karate Chop': { nombre: 'Golpe Karate', poder: 50, tipo: 'Lucha', cat: 'Fis' }, // En Gen2 cambia a Lucha
  'Mach Punch': { nombre: 'Ultrapuño', poder: 40, tipo: 'Lucha', cat: 'Fis' },
  'Cross Chop': { nombre: 'Tajo Cruzado', poder: 100, tipo: 'Lucha', cat: 'Fis' },
  'Dynamic Punch': { nombre: 'Puño Dinámico', poder: 100, tipo: 'Lucha', cat: 'Fis', effect: 'CON', chance: 1.0 },
  'Reversal': { nombre: 'Inversión', poder: 0, tipo: 'Lucha', cat: 'Fis' }, // Variable
  
  // --- VENENO ---
  'Poison Sting': { nombre: 'Picotazo Ven', poder: 15, tipo: 'Veneno', cat: 'Fis', effect: 'PSN', chance: 0.3 },
  'Sludge Bomb': { nombre: 'Bomba Lodo', poder: 90, tipo: 'Veneno', cat: 'Esp', effect: 'PSN', chance: 0.3 },
  
  // --- TIERRA ---
  'Earthquake': { nombre: 'Terremoto', poder: 100, tipo: 'Tierra', cat: 'Fis' },
  'Dig': { nombre: 'Excavar', poder: 80, tipo: 'Tierra', cat: 'Fis' }, // 2 turnos
  'Mud-Slap': { nombre: 'Bofetón Lodo', poder: 20, tipo: 'Tierra', cat: 'Esp', effect: 'ACC_DOWN', chance: 1.0 },
  'Bonemerang': { nombre: 'Huesomerang', poder: 50, tipo: 'Tierra', cat: 'Fis' }, // Golpea 2 veces
  
  // --- VOLADOR ---
  'Wing Attack': { nombre: 'Ataque Ala', poder: 60, tipo: 'Volador', cat: 'Fis' },
  'Peck': { nombre: 'Picotazo', poder: 35, tipo: 'Volador', cat: 'Fis' },
  'Fly': { nombre: 'Vuelo', poder: 90, tipo: 'Volador', cat: 'Fis' }, // 2 turnos
  'Drill Peck': { nombre: 'Pico Taladro', poder: 80, tipo: 'Volador', cat: 'Fis' },
  'Aeroblast': { nombre: 'Aerochorro', poder: 100, tipo: 'Volador', cat: 'Esp' },

  // --- PSÍQUICO ---
  'Psychic': { nombre: 'Psíquico', poder: 90, tipo: 'Psíquico', cat: 'Esp', effect: 'SPDEF_DOWN', chance: 0.1 },
  'Confusion': { nombre: 'Confusión', poder: 50, tipo: 'Psíquico', cat: 'Esp', effect: 'CON', chance: 0.1 },
  'Psybeam': { nombre: 'Psicorrayo', poder: 65, tipo: 'Psíquico', cat: 'Esp', effect: 'CON', chance: 0.1 },
  'Dream Eater': { nombre: 'Comesueños', poder: 100, tipo: 'Psíquico', cat: 'Esp' }, // Solo dormidos

  // --- BICHO ---
  'Megahorn': { nombre: 'Megacuerno', poder: 120, tipo: 'Bicho', cat: 'Fis' },
  'Pin Missile': { nombre: 'Pin Misil', poder: 25, tipo: 'Bicho', cat: 'Fis' }, // 2-5 golpes
  'Fury Cutter': { nombre: 'Corte Furia', poder: 40, tipo: 'Bicho', cat: 'Fis' }, // Sube poder consecutivamente

  // --- ROCA ---
  'Rock Throw': { nombre: 'Lanzarrocas', poder: 50, tipo: 'Roca', cat: 'Fis' },
  'Rock Slide': { nombre: 'Avalancha', poder: 75, tipo: 'Roca', cat: 'Fis', effect: 'FLI', chance: 0.3 },
  'Ancient Power': { nombre: 'Poder Pasado', poder: 60, tipo: 'Roca', cat: 'Esp', effect: 'ALL_UP', chance: 0.1 },
  'Rollout': { nombre: 'Desenrollar', poder: 30, tipo: 'Roca', cat: 'Fis' }, // Sube poder

  // --- FANTASMA ---
  'Lick': { nombre: 'Lengüetazo', poder: 30, tipo: 'Fantasma', cat: 'Fis', effect: 'PAR', chance: 0.3 },
  'Shadow Ball': { nombre: 'Bola Sombra', poder: 80, tipo: 'Fantasma', cat: 'Esp', effect: 'SPDEF_DOWN', chance: 0.2 },
  
  // --- DRAGÓN ---
  'Dragon Rage': { nombre: 'Furia Dragón', poder: 0, tipo: 'Dragón', cat: 'Esp' }, // Daño fijo 40
  'Dragon Breath': { nombre: 'Dragoaliento', poder: 60, tipo: 'Dragón', cat: 'Esp', effect: 'PAR', chance: 0.3 },
  'Outrage': { nombre: 'Enfado', poder: 120, tipo: 'Dragón', cat: 'Fis', effect: 'CON', chance: 1.0 }, // Self confusion

  // --- ACERO (NUEVO GEN 2) ---
  'Steel Wing': { nombre: 'Ala de Acero', poder: 70, tipo: 'Acero', cat: 'Fis', effect: 'DEF_UP', chance: 0.1 },
  'Iron Tail': { nombre: 'Cola Férrea', poder: 100, tipo: 'Acero', cat: 'Fis', effect: 'DEF_DOWN', chance: 0.3 },
  'Metal Claw': { nombre: 'Garra Metal', poder: 50, tipo: 'Acero', cat: 'Fis', effect: 'ATK_UP', chance: 0.1 },

  // --- SINIESTRO (NUEVO GEN 2) ---
  'Bite': { nombre: 'Mordisco', poder: 60, tipo: 'Siniestro', cat: 'Fis', effect: 'FLI', chance: 0.3 }, // Cambiado a Siniestro
  'Crunch': { nombre: 'Triturar', poder: 80, tipo: 'Siniestro', cat: 'Fis', effect: 'DEF_DOWN', chance: 0.2 },
  'Faint Attack': { nombre: 'Finta', poder: 60, tipo: 'Siniestro', cat: 'Fis' }, // Infalible
  'Thief': { nombre: 'Ladrón', poder: 60, tipo: 'Siniestro', cat: 'Fis' },
  'Pursuit': { nombre: 'Persecución', poder: 40, tipo: 'Siniestro', cat: 'Fis' }
};