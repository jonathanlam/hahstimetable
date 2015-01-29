if (typeof String.prototype.contains !== "function") {
	String.prototype.contains = function contains() {
		return String.prototype.indexOf.apply(this, arguments) !== -1;
	}
}

if (typeof Date.now !== "function") {
	Date.now = function now() {
		return +new Date();
	}
}

// constants and stuff

var NEW_YEAR = 0,
	TERM_1 = 1,
	HOLIDAYS_AUTUMN = 2,
	TERM_2 = 3,
	HOLIDAYS_WINTER = 4,
	TERM_3 = 5,
	HOLIDAYS_SPRING = 6,
	TERM_4 = 7,
	CHRISTMAS = 8;

var SOME_TERM = -1;  // not sure about term dates

// gotta initialise those bells

var bells = [
// Monday
{
	"hours":   [ 8,  8,  9, 10, 10, 11, 12, 13, 14, 14],
	"minutes": [40, 50, 41, 32, 51, 42, 33, 13, 04, 55],
	"desc": ["Rollcall", 1, 2, "Recess", 3, 4, "Lunch", 5,6, "School Ends"]
}];

// Tuesday
bells.push({
	"hours": bells[0].hours.slice(),
	"minutes": bells[0].minutes.slice(),
	"desc": bells[0].desc.slice()
});

// Wednesday
bells.push({
	"hours":   [ 8,  8,  9, 10, 10, 11, 12, 12, 14],
	"minutes": [40, 50, 32, 14, 36, 18, 00, 40, 30],
	"desc": ["Rollcall", 1, 2, "Recess", 3,4, "Lunch", "Sport", "School ends"]
});

// Thursday
bells.push({
	"hours":   [ 8,  8,  9, 10, 10, 11, 12, 13, 14],
	"minutes": [40, 50, 41, 32, 51, 42, 33, 13, 04],
	"desc": ["Rollcall", 1, 2, "Recess", 3, 4, "Lunch", 5, "School Ends"]
});

// Friday
bells.push({
	"hours": bells[0].hours.slice(),
	"minutes": bells[0].minutes.slice(),
	"desc": bells[0].desc.slice()
});

// extension classes, yay...

function addExtClasses() {
	if (window.localStorage && localStorage.useTimetable) {
		var days = JSON.parse(localStorage.days);

		for (var day = 0; day < 5; day++) {
			var dayEvents = bells[day];
			var classes = days[day];

			if (classes && classes[0] && classes[0].classId != -2) {
				// P0 aka morning class
				dayEvents.hours.unshift(7);
				dayEvents.minutes.unshift(30);
				dayEvents.desc.unshift(0);
			}

			if (classes && classes[5] && classes[5].classId != -2) {
				// P5 aka afternoon class
				dayEvents.hours.push(4);
				dayEvents.minutes.push(0);
				dayEvents.desc.splice(dayBells.desc.length - 1, 0, 5);
			}
		}
	}
}

addExtClasses();

// halp what am I even doing

$.ajaxSetup({ timeout: 5000 });  // make it usable

function BellEvent(day, eventNo) {
	var dayEvents;
	if (day.constructor === Date) {
		dayEvents = bells[day.getDay() - 1];
		this.holidays = true;
	} else {
		dayEvents = bells[day];
	}

	this.day = day;
	this.eventNo = eventNo;
	this.hour = dayEvents.hours[eventNo];
	this.minute = dayEvents.minutes[eventNo];
	this._desc = dayEvents.desc[eventNo];
}

BellEvent.prototype.getDesc = function getDesc() {
	if (typeof this._desc === "number") {
		var pNum = this._desc;
		var desc = "Period " + pNum;

		if (window.localStorage && localStorage.useTimetable) {
			var day = this.holidays ? this.day.getDay() - 1 : this.day;
			var todayClasses = JSON.parse(localStorage.days)[day];
			var classes = JSON.parse(localStorage.classes);

			if (classes && classes.length && todayClasses && todayClasses.length >= pNum) {
				var period = todayClasses[pNum];
				if (period && typeof period.classId === "number") {
					if (period.classId === -1) {
						// study period
						return "Period " + pNum + " (study)";
					}
					if (period.classId === -2) {
						// extension period, but we don't have class
						// this should never happen.
						return "Period " + pNum + "!?";
					}

					var subject = classes[period.classId];
					var room = period.room;

					if (subject) {
						room = room || subject.room;
						if (subject.subjectName) {
							desc = "Period " + pNum + " - " + subject.subjectName;
						}
					}

					if (room) {
						desc += " (" + room + ")";
					}
				}
			}
		}

		return desc;
	}

	if (this.holidays) {
		return "School Starts";
	}
	return this._desc;
}

BellEvent.prototype.getDate = function getDate() {
	var date;
	if (this.day.constructor === Date) {
		date = new Date(this.day);
	} else {
		date = new Date();
		var weekday = date.getDay();

		if (weekday === 6) {
			// Saturday today, wrap to Monday
			date.setDate(date.getDate() + 2);
		} else if (weekday === this.day) {
			// event is tomorrow
			date.setDate(date.getDate() + 1);
		} else if (weekday === 5 && !this.day) {
			// Friday after school, event is Monday
			date.setDate(date.getDate() + 3);
		}
	}

	date.setHours(this.hour);
	date.setMinutes(this.minute);
	date.setSeconds(secsOffset-18-4-3-8+39-1);
	return date;
};

BellEvent.getNext = function getNext() {
	var now = new Date();
	now.setSeconds(now.getSeconds() + secsOffset);

	var term = getTerm(now);
	if (!(term & 1)) {
		// holidays, yay
		return new this(terms[term], 0);
	}

	var day = now.getDay() - 1;
	var nowH = now.getHours(), nowM = now.getMinutes();
	var dayEvents = bells[day], eventNo = 0;
	var lastEvNo = dayEvents && dayEvents.hours.length - 1;

	if (day === -1 || day === 5) {
		// weekend, wrap around to Monday
		day = 0;
	} else if (nowH > dayEvents.hours[lastEvNo] || (nowH === dayEvents.hours[lastEvNo] && nowM > dayEvents.minutes[lastEvNo])) {
		// past the school day, wrap to next morning
		day++;
		if (day === 5) {
			// Friday after school, wrap to Monday
			day = 0;
		}
	} else {
		// calculate next event
		while (eventNo < lastEvNo && (nowH > dayEvents.hours[eventNo] || (nowH == dayEvents.hours[eventNo] && nowM > dayEvents.minutes[eventNo]))) {
			eventNo++;
		}
	}

	return new this(day, eventNo);
}

function updateCountdown(event) {
	var format = "%-Mm %Ss";

	if (event.offset.totalDays) {
		// some days left, show days *and* hours
		format = "%-Dd %-Hh " + format;
	} else if (event.offset.hours) {
		// some hours left, show hours
		format = "%-Hh " + format;
	}

	$(this).text(event.strftime(format));
}

function finishCountdown() {
	$(this).text("... about now.");
	// set the new countdown after half a minute
	setTimeout(theFinalCountdown, 30000);
}

// https://youtu.be/9jK-NcRmVcw
function theFinalCountdown() {
	setCountdown(BellEvent.getNext());
}

function setCountdown(ev) {
	$("#bell-countdown").countdown(ev.getDate())
	.on("update.countdown", updateCountdown)
	.on("finish.countdown", finishCountdown);

	$("#bell-descript").text(ev.getDesc());

	if (ev.eventNo > 0 && typeof ev.day === "number") {
		$("#bell-current").text("Now: " + new BellEvent(ev.day, ev.eventNo - 1).getDesc()).show();
	} else {
		$("#bell-current").hide();
	}
}

// school computers don't even know what time it is

// amount of time system clock is ahead by
var secsOffset = 0;

function getRealTime() {
	$.ajax({
		url: "http://vovo.id.au/scripts/time.php",
		async: false,
		dataType: "text",
		success: function (data) {
			secsOffset = (Date.now()/1000>>>0) - data;
		}
	});
}

// oh god holidays

function parseTerms(data) {
	var termDates = data.results.termDates;
	var terms = [];
	for (var i = 1, term; term = termDates[i]; i++) {
		// we only care for students in the eastern division
		if (term.title.contains(" for students (Eastern ")) {
			terms.push(new Date(term.start));
			var end = new Date(term.end);
			var endEvents = bells[end.getDay() - 1];
			end.setHours(endEvents.hours[9]);
			end.setMinutes(endEvents.minutes[9]);
			terms.push(end);
		}
	}
	window.terms = terms;
}

function getTerm(date) {
	if (!window.terms) {
		// we have no idea when the terms are, bail
		return SOME_TERM;
	}

	var time = +date;
	for (var i = 0; i < 8; i++) {
		if (time < terms[i]) {
			return i;
		}
	}
	return CHRISTMAS;
}

$(function () {
	getRealTime();

	$.getJSON("https://www.kimonolabs.com/api/8puk29vu?apikey=CynVJv6skGTKh5o5Q2CDEmWo1ix62b75", parseTerms)
		.always(theFinalCountdown);
});
