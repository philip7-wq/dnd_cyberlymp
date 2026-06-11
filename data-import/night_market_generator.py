#!/usr/bin/env python3

from random import randrange

#list hell
market_types = ['Food and Drugs', 'Personal Electronics', 'Weapons and Armor', 'Cyberware',
		'Clothing and Fashionware', 'Survival Gear']
food_list = ['Canned Goods, 10eb', 'Packaged goods, 10eb', 'Frozen Goods, 10eb', 'Bags of Grain, 20eb',
	     'Kibble Pack, 10eb', 'Bags of Prepak, 20eb', 'Street Drugs of 20eb or less',
	     'Poor Quality Alcohol, 10eb', 'Alcohol, 20eb', 'Excellent Quality Alcohol, 100eb', 'MRE, 10eb',
	     'Live Chicken, 50eb', 'Live Fish, 50eb', 'Fresh Fruits, 50eb', 'Fresh Vegetables, 50eb',
	     'Root Vegetables, 20eb', 'Live Pigs, 100eb', 'Exotic Fruits, 100eb', 'Exotic Vegetables, 100eb',
	     'Street Drugs of exactly 50eb']
electro_list = ['Agent, 100eb', 'Programs or Hardware of 100eb or less', 'Audio Recorder, 100eb',
		'Bug Detector, 500eb', 'Chemical Analyzer, 1000eb', 'Computer, 50eb', 'Cyberdeck, 500eb',
		'Disposable Cell Phone, 50eb', 'Electric Guitar or Other Instrument, 500eb',
		'Programs or Hardware of exactly 500eb', 'Medscanner, 1000eb', 'Homing Tracer, 500eb',
		'Radio Communicator, 100eb', 'Techscanner, 1000eb', 'Smart Glasses, 500eb', 'Radar Detector, 500eb',
		'Scrambler/Descrambler, 500eb', 'Radio Scanner/Music Player, 50eb', 'Braindance Viewer, 1000eb',
		'Virtuality Goggles, 100eb']
weapons_list = ['Medium Pistol', 'Heavy Pistol or Very Heavy Pistol', 'SMG', 'Heavy SMG', 'Shotgun', 'Assault Rifle',
		'Sniper Rifle', 'Bows or Crossbow', 'Grenade Launcher or Rocket Launcher', 'Light Melee Weapon',
		'Medium Melee Weapon', 'Heavy Melee Weapon', 'Very Heavy Melee Weapon', 'A single Exotic Weapon of GM\'s choice',
		'Ammunition of 500eb or less', 'Armor of 100eb or less', 'Armor of exactly 500eb', 'Armor of exactly 1000eb',
		'Weapon Attachments of 100eb or less', 'Weapon Attachments of 500eb or higher']
cyberware_list = ['Cybereye, 100eb', 'Cyberaudio Suite, 500eb', 'Neural Link, 500eb', 'Cyberarm, 500eb', 'Cyberleg, 100eb',
		  'External Cyberware of exactly 1000eb', 'External Cyberware of 500eb or less',
		  'Internal Cyberware of exactly 1000eb', 'Internal Cyberware of 500eb or less',
		  'Cybereye Option of exactly 1000eb', 'Cybereye Option of 500eb or less',
		  'Cyberaudio Option of exactly 1000eb', 'Cyberaudio Option of 500eb or less',
		  'Neuralware Option of exactly 1000eb', 'Neuralware Option of 500eb or less',
		  'Cyberlimb Option of exactly 1000eb', 'Cyberlimb Option of 500eb or less', 'Fashionware of GM\'s Choice',
		  'Borgware of GM\'s Choice', 'Any Cyberware of GM\'s Choice']
clothes_list = ['Bag Lady Chic', 'Gang Colors', 'Generic Chic', 'Bohemian', 'Leisurewear', 'Nomad Leather', 'Asia Pop',
		'Urban Flash', 'Businesswear', 'High Fashion', 'Biomonitor, 100eb', 'Chemskin, 100eb', 'EMP Threading, 10eb',
		'Light Tatoo, 100eb', 'Shift Tacts, 100eb', 'Skinwatch, 100eb', 'Techhair, 100eb', 'Generic Chic',
		'Leisurewear', 'Gang Colors']
survival_list = ['Anti-Smog Breathing Mask, 20eb', 'Auto-Level Dampening Ear Protectors, 1000eb', 'Binoculars, 50eb',
		 'Carryall, 20eb', 'Flashlight, 20eb', 'Duct Tape, 20eb', 'Inflatable Bed & Sleep-bag, 20eb',
		 'Lock-Picking Set, 20eb', 'Handcuffs, 50eb', 'Medtech Bag, 100eb', 'Tent and Camping Equipment, 50eb',
		 'Rope (60m), 20eb', 'Techtool, 100eb', 'Personal CarePack, 20eb', 'Radiation Suit, 1000eb',
		 'Road Flare, 10eb', 'Grapple Gun, 100eb', 'Tech Bag, 500eb', 'Shovel or Axe, 50eb', 'Airhypo, 50eb']
market_types_lists = [food_list, electro_list, weapons_list, cyberware_list, clothes_list, survival_list]
quality_list = ['Poor', 'Average', 'Excellent']

gun_dict = {
	'Medium Pistol': 50,
	'Heavy Pistol or Very Heavy Pistol' : 100,
	'SMG': 100,
	'Heavy SMG': 100,
	'Shotgun': 500,
	'Assault Rifle': 500,
	'Sniper Rifle': 500,
	'Bows or Crossbow': 100,
	'Grenade Launcher or Rocket Launcher': 500,
	'Light Melee Weapon': 50,
	'Medium Melee Weapon': 50,
	'Heavy Melee Weapon': 100,
	'Very Heavy Melee Weapon': 100,
	'A single Exotic Weapon of GM\'s choice' : 0,
	'Armor of 100eb or less': 100,
	'Armor of exactly 500eb': 500,
	'Armor of exactly 1000eb': 1000,
	'Ammunition of 500eb or less' : 500,
	'Weapon Attachments of 100eb or less': 100,
	'Weapon Attachments of 500eb or higher': 500}

###Functions and classes

class Weapon():
	def __init__(self):
		self.type = ''
		self.price = 0
		self.quality = randrange(10)
		self.quality_trig = 1
		if (self.quality < 4):
			self.quality = 0
		elif (self.quality > 7):
			self.quality = 2
		else:
			self.quality = 1
	
	def update_gun(self, gun_type, price, trigger_quality):
		self.type = gun_type
		if (trigger_quality):
			self.quality_trig = 0
			return()
		if (self.quality == 0):
			if (price == 50):
				self.price = 20
			elif (price == 100):
				self.price = 50
			else:
				self.price = 100
		elif (self.quality == 2):
			if (price == 50):
				self.price = 100
			elif (price == 100):
				self.price = 500
			else:
				self.price = 1000
		else:
			self.price = price

def check_sim(liste, numb):
    i = len(liste)
    j = 0
    trigger = 0
    while (i > j):
        if (liste[j] == numb):
            trigger = 1
        j = j + 1
    return (trigger)

def fill_list(liste, n, dice):
	i = 1
	liste.append(randrange(dice))
	while(n > i):
	    j = randrange(dice)
	    while (check_sim(liste, j)):
	        j = randrange(dice)
	    i = i + 1
	    liste.append(j)
	return(liste)

def gun_generator(roll):
	gun = Weapon()
	if (roll > 13):
		gun.update_gun(weapons_list[roll], gun_dict[weapons_list[roll]], 1)
	else:
		gun.update_gun(weapons_list[roll], gun_dict[weapons_list[roll]], 0)
	return (gun)

def gun_reader(gun_list):
	for gun in gun_list:
		print(gun.type, end = '')
		if (gun.quality_trig):
			print('(' + quality_list[gun.quality],'Quality), sold at ', end = '')
			if (gun.price):
				print(str(int(gun.price))+'eb')
			else:
				print('the appropriate price')
		else:
			print(' ')

def check_guns(mtvar):
	if (mtvar[0] != 2 and mtvar[1] != 2):
		return(0)
	else:
		return(1)

def gen_gun_list(gun_numbers):
	i = len(gun_numbers)
	j = 0
	gun_list = []
	while(j < i):
		gun_list.append(gun_generator(gun_numbers[j]))
		j = j + 1
	gun_reader(gun_list)

###Market type
market_type_var = [0, 0]
trigger = 0
for i in market_type_var:
	i = randrange(6)
	if (trigger == 1):
		while (market_type_var[0] == i):
			i = randrange(6)
	market_type_var[trigger] = i
	trigger = 1

###Item number for every category

items_number = [randrange(10) + 1, randrange(10) + 1]
i = 0
first_list = []
second_list = []
first_list = fill_list(first_list, items_number[0], 20)
second_list = fill_list(second_list, items_number[1], 20)

### Quality of Weapons



#Print infos
reminder = 0
print('Welcome, choomba!\nThis Night Market is selling:')
for i in market_type_var:
	print(market_types[i])
if (not(check_guns(market_type_var))):
	print('\nThere\'s', items_number[0], 'items of the first category, and ', items_number[1], 'items of the second.')
	print('\nOn the stand, you can find:\n')
	for i in first_list:
		print(market_types_lists[market_type_var[0]][i])
	for i in second_list:
		print(market_types_lists[market_type_var[1]][i])
else:
	print('\nThere\'s', items_number[0], 'items of the first category, and ', items_number[1], 'items of the second.')
	print('\nOn the stand, you can find:\n')
	if (market_type_var[0] != 2):
		for i in first_list:
			print(market_types_lists[market_type_var[0]][i])
	else:
		gen_gun_list(first_list)
		reminder = 1
		
	if (market_type_var[1] != 2):
		for i in second_list:
			print(market_types_lists[market_type_var[1]][i])
	else:
		gen_gun_list(second_list)
		reminder = 1

if (reminder):
	print("\n\nA little reminder for you, choomba: a Poor Quality weapon jam on a roll of one, and an Excellent \
Quality weapon gives you +1 on all attack checks.")
