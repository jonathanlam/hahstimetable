// editing the timetable

var WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

$(function () {
	if (!window.localStorage) {
		$(".container").prepend($('<div class="alert alert-warning" role="alert">This browser is unsupported. Timetable functionality is unavailable.</div>').alert());
		return false;
	}

	/*if (localStorage.useTimetable) {
		document.getElementById("check-usetimetable").checked = true;
	} else {
		document.getElementById("check-usetimetable").checked = false;
		disablePage();
	}*/

	$("#check-usetimetable").click(toggleUseTimetable);

	$("#export").on("show.bs.modal", doExport);
	$("#add-subject").on("show.bs.modal", onOpenAddSubject);
	$("#edit-subject").on("show.bs.modal", onOpenEditSubject);

	var subjects = JSON.parse(localStorage.classes || "[]"), periods = JSON.parse(localStorage.days || "[]");

	for (var p = 0; p < 6; p++) {
		var tds = $("#tt-p" + p + " td");
		for (var d = 1; d < 6; d++) {
			var td = $(tds[d]);
			timetableCellDisplay(td, d-1, p, subjects, periods);
			if (!(d === 3 && p === 4)) {
				td.click((function (day, pNum) {
					return function () {
						doOpenEditPeriod(day, pNum);
					};
				})(d-1, p));
			}
		}
	}
});

// disable everything (besides #check-usetimetable)
function disablePage() {
	// ...
}

function toggleUseTimetable() {
	if (localStorage.useTimetable) {
		localStorage.removeItem("useTimetable");
		disablePage();
	} else {
		localStorage.useTimetable = true;
	}
}

function timetableCellDisplay(td, day, pNum, subjects, periods) {
	if (day === 2 && pNum === 4) {
		td.text("Sport");
		return;
	}
	var classes = periods[day];
	if (classes) {
		var period = classes[pNum];
		if (period) {
			if (period.classId === -2) {
				return;
			}
			if (period.classId === -1) {
				td.text("Study");
				return;
			}
			var subject = subjects[period.classId];
			var room = period.room || subject.room;
			if (room) {
				td.text(subject.subjectName + " (" + room + ")");
			} else {
				td.text(subject.subjectName);
			}
		}
	}
}

function resetTimetableDisplay() {
	var subjects = JSON.parse(localStorage.classes), periods = JSON.parse(localStorage.days);
	for (var p = 0; p < 6; p++) {
		var tds = $("#tt-p" + p + " td");
		for (var d = 1; d < 6; d++) {
			timetableCellDisplay($(tds[d]), d-1, p, subjects, periods);
		}
	}
}

function doImport() {
	var text = document.getElementById("text-import").value;
	var obj;
	try {
		obj = JSON.parse(text);
	} catch (ex) {}

	if (obj && (obj.classes || obj.days)) {
		if (obj.classes) {
			localStorage.classes = JSON.stringify(obj.classes);
		}
		if (obj.days) {
			localStorage.days = JSON.stringify(obj.days);
		}
		alert("Done!");
	} else {
		alert("That doesn't look like timetable data!");
	}
}

function doExport() {
	$("#text-export").text(JSON.stringify({
		classes: localStorage.classes && JSON.parse(localStorage.classes),
		days: localStorage.days && JSON.parse(localStorage.days)
	}));
}

function onOpenAddSubject() {
	var inputName = document.getElementById("input-add-subject-name");
	inputName.value = "";
	document.getElementById("input-add-subject-room").value = "";
}

function onOpenEditSubject() {
	//
}

function doOpenEditPeriod(day, pNum) {
	$("#edit-period-day").text(WEEKDAY_NAMES[day]);
	$("#edit-period-num").text(pNum);
	document.getElementById("input-period-room").value = "";

	var subjects = JSON.parse(localStorage.classes), days = JSON.parse(localStorage.days || "[]"), classId;
	if (days[day] && days[day][pNum]) {
		classId = days[day][pNum].classId;
	}

	var selectSubjectElem = document.getElementById("select-period-subject");
	selectSubjectElem.innerHTML = "";

	var optElem = document.createElement("option");
	optElem.text = "--- Pick a subject ---";
	selectSubjectElem.add(optElem, null);

	for (var i = 0; i < subjects.length; i++) {
		optElem = document.createElement("option");
		optElem.value = i;
		optElem.text = subjects[i].subjectName;
		if (i === classId) {
			optElem.selected = true;
		}
		selectSubjectElem.add(optElem, null);
	}

	$("#edit-period").modal();
}

function doAddSubject() {
	var subjects = localStorage.classes ? JSON.parse(localStorage.classes) : [];
	subjects.push({
		subjectName: document.getElementById("input-add-subject-name").value,
		room: document.getElementById("input-add-subject-room").value
	});
	localStorage.classes = JSON.stringify(subjects);
	alert("Done!");
}

function doDelSubject() {
	//
}

function doEditSubject() {
	//
}

function savePeriod() {
	var day = WEEKDAY_NAMES.indexOf($("#edit-period-day").text());
	if (day === -1) {
		console.error("unknown day in #edit-period-day text");
		return;
	}

	var pNum = $("#edit-period-num").text() >>> 0;
	if (pNum > 5) {
		console.error("#edit-period-num out of range");
		return;
	}

	var days = localStorage.days ? JSON.parse(localStorage.days) : [];
	var periods = days[day] || (days[day] = []);
	var period = periods[pNum] || (periods[pNum] = {});

	period.classId = document.getElementById("select-period-subject").value >>> 0;
	var subjects = JSON.parse(localStorage.classes)
	var subject = subjects[period.classId];
	var room = document.getElementById("input-period-room").value;
	if (room && room !== subject.room) {
		period.room = room;
	}

	periods[pNum] = period;
	localStorage.days = JSON.stringify(days);
	alert("Done!");

	// damn you selectors and your 1-indexing
	timetableCellDisplay($("#tt-p" + pNum + " td:nth-child(" + (day+2) + ")"), day, pNum, subjects, days);
}

function doClearPeriod() {
	var dayName = $("#edit-period-day").text();
	var day = WEEKDAY_NAMES.indexOf(dayName);
	if (day === -1) {
		console.error("unknown day in #edit-period-day text");
		return;
	}

	var pNum = $("#edit-period-num").text() >>> 0;
	if (pNum > 5) {
		console.error("#edit-period-num out of range");
		return;
	}

	if (confirm("Are you sure you want to clear " + dayName + " period " + pNum + "?")) {
		clearPeriod(day, pNum);
	}
}

function clearPeriod(day, pNum) {
	var days = JSON.parse(localStorage.days);
	days[day][pNum] = {
		classId: (pNum === 0 || pNum === 5) ? -2 : -1
	};
	localStorage.days = JSON.stringify(days);
}

function doReset() {
	if (confirm("Are you sure you wish to reset your timetable data?")) {
		localStorage.classes = "[]";
		localStorage.days = "[]";
		alert("Done!");
	}
}
