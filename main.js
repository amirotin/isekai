'use strict';

function getLang() {
	return localStorage.getItem('lang') || 'RU';
}

class City {
    constructor(id, nameRU, nameEN, produces = null) {
		this.id = id;
        this.nameRU = nameRU;
		this.nameEN = nameEN;
        this.produces = produces;
    }
	
	get title() {
		return this['name' + getLang()];
	}
}

class Product {
    constructor(id, nameRU, nameEN, img) {
		this.id = id;
        this.nameRU = nameRU;
		this.nameEN = nameEN;
		this.img = img;
    }
	
	get title() {
		return this['name' + getLang()];
	}
}

const conch = new Product(1, 'Эхо-раковина', 'Echoing Conch', 'conch.png');
const silk = new Product(2, 'Паучий шелк', 'Spider Silk', 'silk.png');
const sakura = new Product(3, 'Сакура', 'Sakura', 'sakura.png');
const cactus = new Product(4, 'Кактус Сэндтопии', 'Sandtopia Cactus', 'cactus.png');
const tree = new Product(5, 'Зимний побег дерева', 'Winter Tree Shoot', 'tree.png');
const bell = new Product(6, 'Колокольчики', 'Possessed Wind Chimes', 'bell.png');
const claw = new Product(7, 'Клешня краба', 'Ship Crab Claw', 'claw.png');
const bone = new Product(8, 'Кость скелетона', 'Skeleton Bone', 'bone.png');
const feather = new Product(9, 'Перо пидженрата', 'Pigeonrath Feather', 'feather.png');
const prisma = new Product(10, 'Лазерная призма', 'Ancient Laser Prism', 'prisma.png');
const amber = new Product(11, 'Янтарь', 'Ambergris', 'amber.png');
const fang = new Product(12, 'Клык питона', 'Fang of Python', 'fang.png');
const kappa = new Product(13, 'Самоцвет каппы', 'Gem of Kappa', 'kappa.png');
const scale = new Product(14, 'Чешуя дракона', 'Ice Dragon Scale', 'scale.png');
const fruit = new Product(15, 'Фрукт крокодил', 'Sand Crocodile Fruit', 'fruit.png');
const tentacle = new Product(16, 'Щупальце чудовища', 'Sea Monster Tentacles', 'tentacle.png');
const oni = new Product(17, 'Кубок Они', 'Oni Cup', 'oni.png');
const flame = new Product(18, 'Адское пламя', 'Infernal Flames', 'flame.png');
const horn = new Product(19, 'Рог ледяного гиганта', 'Ice Giant Horn', 'horn.png');
const soul = new Product(20, 'Узы души', 'Soul-Sealed Bandage', 'soul.png');
const hellbat = new Product(21, 'Перепонка крыла хэлбэт', 'Hellbat Wing Membrane', 'hellbat.png');
const lantern = new Product(22, 'Фонарь духов', 'Lantern of Spirits', 'lantern.png');
const ore = new Product(23, 'Кусок волшебной руды', 'Magic Ore Chunk', 'ore.png');
const mane = new Product(24, 'Sphinx Mane', 'Sphinx\'s Mane', 'mane.png');
const slate = new Product(25, 'Древняя фреска', 'Ancient Slate', 'slate.png');
const weed = new Product(26, 'Перекати-поле', 'Tumbleweed', 'weed.png');

const berg = new City(1, 'Дракенберг', 'Drakenberg', sakura);
const dungeon = new City(2, 'Подземелье дракона', 'Dragon Dungeon', tree);
const mountain = new City(3, 'Гора драконов', 'Dragonflight Mountain');
const forest = new City(4, 'Злой лес', 'Evil Forest');
const elven = new City(5, 'Эльфийский лес', 'Elven Forest', conch);
const oasis = new City(6, 'Город-оазис', 'Oasis City');
const ruins = new City(7, 'Древние руины', 'Ancient City Ruins');
const sand = new City(8, 'Великая пустыня', 'Sandtopia', fruit);
const sanct = new City(9, 'Заповедник', 'Sandcastle Sanctuary');
const ice = new City(10, 'Континент льда', 'Ice Continent', tree);
const tundra = new City(11, 'Тундра Эйсвинтер', 'Elswinter Tundra', feather);
const cave = new City(12, 'Драконья пещера', 'Dragon Cave', scale);
const snow = new City(13, 'Северный Снегберг', 'Northrealm Snowberg', horn);
const darkwood = new City(14, 'Темнолесье', 'Darkwood Forest');
const grave = new City(15, 'Кладбище', 'Graveyard');
const under = new City(16, 'Подземный город', 'Undercity');
const volcano = new City(17, 'Подземный вулкан', 'Underground Volcano', flame);
const island = new City(18, 'Остров сакуры', 'Sakura Island', sakura);
const isles = new City(19, 'Тысяча островов', 'Myriad Isles', bell);
const whirl = new City(20, 'Остров вихрей', 'Whirl Island', kappa);
const oniisle = new City(21, 'Остров Они', 'Oni Island', oni);
const reef = new City(22, 'Коралловый риф', 'Coral Reef', conch);
const ship = new City(23, 'Затонувшие корабли', 'Shipwreck Area', claw);
const storm = new City(24, 'Зона шторма', 'Storm Zone', amber);
const sea = new City(25, 'Спокойное море', 'Tranquil Sea', tentacle);

const stages = [
	[mountain, cactus, forest, silk, oasis, cactus, ruins, prisma, sanct, soul, darkwood, silk, grave, bone, under, fang],
	[mountain, cactus, forest, hellbat, oasis, cactus, ruins, prisma, sanct, soul, darkwood, hellbat, grave, lantern, under, ore],
	[mountain, weed, forest, hellbat, oasis, weed, ruins, slate, sanct, mane, darkwood, hellbat, grave, lantern, under, ore]
];

const products = [conch, silk, sakura, cactus, tree, bell, claw, bone, feather, prisma, amber, fang, kappa, scale, fruit, tentacle, oni, flame, horn, soul, hellbat, lantern, ore, mane, slate, weed];
const cities = [berg, dungeon, mountain, forest, elven, oasis, ruins, sand, sanct, ice, tundra, cave, snow, darkwood, grave, under, volcano, island, isles, whirl, oniisle, reef, ship, storm, sea];

class DynamicSelect {

    constructor(element, options = {}) {
        let defaults = {
            placeholder: 'Select an option',
            columns: 1,
            name: '',
            width: '100%',
            height: '',
            data: [],
			selectedVal: 0,
            onChange: function() {}
        };
        this.options = Object.assign(defaults, options);
		this.selectedValue = this.options.selectedVal;
        this.selectElement = typeof element === 'string' ? document.querySelector(element) : element;
        for(const prop in this.selectElement.dataset) {
            if (this.options[prop] !== undefined) {
                this.options[prop] = this.selectElement.dataset[prop];
            }
        }
        this.element = this._template();
        this.selectElement.replaceWith(this.element);
        this._updateSelected();
        this._eventHandlers();
    }

    _template() {
        let optionsHTML = '';
        for (let i = 0; i < this.data.length; i++) {
            let optionWidth = 100 / this.columns;
            let optionContent = `
				${this.data[i].img ? `<img src="img/${this.data[i].img}" alt="${this.data[i].title}" style="'width: 64; height: 64;'">` : ''}
				${this.data[i].title ? '<span class="dynamic-select-option-text">' + this.data[i].title + '</span>' : ''}
			`;
            optionsHTML += `
                <div class="dynamic-select-option${this.data[i].id == this.selectedValue ? ' dynamic-select-selected' : ''}" data-value="${this.data[i].id}" style="width:${optionWidth}%;${this.height ? 'height:' + this.height + ';' : ''}">
                    ${optionContent}
                </div>
            `;
        }
        let template = `
            <div class="dynamic-select ${this.name}"${this.selectElement.id ? ' id="' + this.selectElement.id + '"' : ''} style="${this.width ? 'width:' + this.width + ';' : ''}${this.height ? 'height:' + this.height + ';' : ''}">
                <input type="hidden" name="${this.name}" value="${this.selectedValue}">
                <div class="dynamic-select-header" style="${this.width ? 'width:' + this.width + ';' : ''}${this.height ? 'height:' + this.height + ';' : ''}"><span class="dynamic-select-header-placeholder">${this.placeholder}</span></div>
                <div class="dynamic-select-options" style="${this.options.dropdownWidth ? 'width:' + this.options.dropdownWidth + ';' : ''}${this.options.dropdownHeight ? 'height:' + this.options.dropdownHeight + ';' : ''}">${optionsHTML}</div>
            </div>
        `;
        let element = document.createElement('div');
        element.innerHTML = template;
		element.classList.add("dynamic-box");
        return element;
    }

    _eventHandlers() {
        this.element.querySelectorAll('.dynamic-select-option').forEach(option => {
            option.onclick = () => {
                this.element.querySelectorAll('.dynamic-select-selected').forEach(selected => selected.classList.remove('dynamic-select-selected'));
                option.classList.add('dynamic-select-selected');
                this.element.querySelector('.dynamic-select-header').innerHTML = option.innerHTML;
                this.element.querySelector('input').value = option.getAttribute('data-value');
				this.selectedValue = option.getAttribute('data-value');
                this.element.querySelector('.dynamic-select-header').classList.remove('dynamic-select-header-active');
                this.options.onChange(
					option.getAttribute('data-value'),
					option.querySelector('.dynamic-select-option-text') ? option.querySelector('.dynamic-select-option-text').innerHTML : '',
					option,
					this.data.filter(data => data.id == option.getAttribute('data-value'))[0]);
            };
        });
        this.element.querySelector('.dynamic-select-header').onclick = () => {
            this.element.querySelector('.dynamic-select-header').classList.toggle('dynamic-select-header-active');
        };  
        if (this.selectElement.id && document.querySelector('label[for="' + this.selectElement.id + '"]')) {
            document.querySelector('label[for="' + this.selectElement.id + '"]').onclick = () => {
                this.element.querySelector('.dynamic-select-header').classList.toggle('dynamic-select-header-active');
            };
        }
        document.addEventListener('click', event => {
            if (!event.target.closest('.' + this.name) && !event.target.closest('label[for="' + this.selectElement.id + '"]')) {
                this.element.querySelector('.dynamic-select-header').classList.remove('dynamic-select-header-active');
            }
        });
    }

    _updateSelected() {
        if (this.selectedValue) {
            this.element.querySelector('.dynamic-select-header').innerHTML = this.element.querySelector('.dynamic-select-selected').innerHTML;
        }
    }

    set data(value) {
        this.options.data = value;
    }

    get data() {
        return this.options.data;
    }

    set selectElement(value) {
        this.options.selectElement = value;
    }

    get selectElement() {
        return this.options.selectElement;
    }

    set element(value) {
        this.options.element = value;
    }

    get element() {
        return this.options.element;
    }

    set placeholder(value) {
        this.options.placeholder = value;
    }

    get placeholder() {
        return this.options.placeholder;
    }

    set columns(value) {
        this.options.columns = value;
    }

    get columns() {
        return this.options.columns;
    }

    set name(value) {
        this.options.name = value;
    }

    get name() {
        return this.options.name;
    }

    set width(value) {
        this.options.width = value;
    }

    get width() {
        return this.options.width;
    }

    set height(value) {
        this.options.height = value;
    }

    get height() {
        return this.options.height;
    }

}

function nextStep(city, cities) {
    return cities.filter(obj => obj.needs === city.produces);
}

function removeCity(city, cities) {
    return cities.filter(obj => obj !== city);
}

function findRoutes(currentCity, startCity, cities, currentRoute, allRoutes) {
    currentRoute.push(currentCity);
    
    if (currentRoute.length > 1 && currentCity === startCity) {
        allRoutes.push([...currentRoute]);
    }

    const possibleCities = cities.filter(obj => obj.needs === currentCity.produces);
    for (const nextCity of possibleCities) {
        findRoutes(nextCity, startCity, removeCity(nextCity, cities), currentRoute, allRoutes);
    }
    currentRoute.pop();
}


function removeDuplicateLists(listOfLists) {
    const uniqueSets = new Set();
    const uniqueLists = [];
    
    for (const list of listOfLists) {
        const currentSet = new Set(list.toSorted((a,b) => a.id - b.id));

        if (!uniqueSets.has(JSON.stringify([...currentSet]))) {
            uniqueSets.add(JSON.stringify([...currentSet]));
            uniqueLists.push(list);
        }
    }
    
    return uniqueLists;
}


function getRoutes() {
	const routes = [];
	const $routesList = $('#routes-list');
	$routesList.empty();

	const workCities = cities.filter(data => data.disabled != true);
	for (const startingCity of workCities) {
		findRoutes(startingCity, startingCity, workCities, [], routes);
	}
	const uniqueRoutes = removeDuplicateLists(routes);
	
	
	
	for (const route of uniqueRoutes) {
		const $routeItem = $('<li/>');
		for (const [i, city] of route.entries()) {
			$routeItem.append($(`<span>${city.title}${(i===route.length-1)?'':' => '}</span>`));
		}
		
		$routesList.append($routeItem);
	}
}

function changeStage(stageId) {
	localStorage.setItem('stage', stageId);
	const stageArr = stages[stageId-1];
	for (var i = 0; i < stageArr.length; i += 2) {
		stageArr[i].produces = stageArr[i+1];
	}
}

$(document).ready(function() {
	const stageId = localStorage.getItem('stage') || '1';

	if (getLang() == 'RU') {
		$('#language-toggle').prop('checked', false);
		$('#eventname').text('ФТГ');
		$(".reset_btn").text('сброс');
		$(".build_btn").text('маршруты');
		document.title = 'Фестиваль торговой гильдии';
	} else {
		$('#language-toggle').prop('checked', true);
		$('#eventname').text('GTF');
		$(".reset_btn").text('reset');
		$(".build_btn").text('routes');
		document.title = 'Guild Trade Festival';
	}
	
	$('input:radio[name=stage][value='+stageId+']').prop('checked', true);
	$('input:radio[name=stage]').click(function() {
		location.reload();
		changeStage($(this).val());
	});
	changeStage(stageId);

    const $cityList = $('#city-list');
    cities.forEach(city => {
        const $cityItem = $(`
            <li>
			    <div class='info_container'><input type="checkbox" checked id="${city.id}" name="citytoggle">
                    <div class='info__box'> 
                        <p class="city">${city.title}</p>
                        <p class="product">${city.produces.title}</p>
                    </div>
                </div>
				<select class="custom-select"></select>
            </li>
        `);
		const $select = new DynamicSelect($cityItem.find(`select`)[0], {
			placeholder: 'Выберите товар',
			name: 'product-'+city.id,
			cityId: city.id,
			columns: 1,
			data: products,
			selectedVal: localStorage.getItem('product-'+city.id),
			onChange: function(value, text, option, data) {
				localStorage.setItem(this.name, value);
				cities.filter(city => city.id == this.cityId)[0].needs = data;
			}
		});
		city.needs = products.filter(data => data.id.toString() == localStorage.getItem('product-'+city.id))[0];
        $cityList.append($cityItem);
    });
	
	$(".reset_btn").click(() => {localStorage.clear(); location.reload();})
	$(".build_btn").click(() => {getRoutes();})
	$('#language-toggle').change(function() {
		localStorage.setItem('lang', $(this).is(':checked') ? 'EN' : 'RU');
		location.reload();
	});
	$('input[type="checkbox"][name=citytoggle]').change(function() {
		cities.filter(data => data.id == $(this).attr('id'))[0].disabled = !$(this).is(':checked');
	});
	$('p.city').click(function() {
		$(this).closest('li').find('input[type="checkbox"]')[0].click();
	});
});
