const fs = require("fs");

// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function timeToSeconds(timeStr) {
    let [time, modifier] = timeStr.trim().split(" "); // ["6:01:20", "am"]
    let [hours, minutes, seconds] = time.split(":").map(Number);

    if(modifier.toLowerCase() === "pm" && hours !== 12) hours += 12;
    if(modifier.toLowerCase() === "am" && hours === 12) hours = 0;

    return hours*3600 + minutes*60 + seconds;
}

// h:mm:ss
function secToTime(totalSec) {
    let h = Math.floor(totalSec/3600);
    let m = Math.floor((totalSec % 3600)/60);
    let s = totalSec % 60;
    return `${h}:${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

function getShiftDuration(startTime, endTime) {

    let startSec = timeToSeconds(startTime);
    let endSec = timeToSeconds(endTime);
    let diff = endSec - startSec;
    if(diff < 0) diff += 24*3600; 
    return secToTime(diff);
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    let startSec = timeToSeconds(startTime);
    let endSec = timeToSeconds(endTime);
    if(endSec < startSec) endSec += 24*3600;

    let deliveryStart = 8*3600; // 8:00 AM
    let deliveryEnd = 22*3600; // 10:00 PM

    let idle = 0;

    if(startSec < deliveryStart) idle += Math.min(deliveryStart - startSec, endSec - startSec);
    if(endSec > deliveryEnd) idle += Math.max(0, endSec - deliveryEnd);

    return secToTime(idle);
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
   let s1 = shiftDuration.split(":");
    let s2 = idleTime.split(":");

    let shift = Number(s1[0])*3600 + Number(s1[1])*60 + Number(s1[2]);
    let idle = Number(s2[0])*3600 + Number(s2[1])*60 + Number(s2[2]);

    let active = shift - idle;

    return secToTime(active);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
    let a = activeTime.split(":");
    let active = Number(a[0])*3600 + Number(a[1])*60 + Number(a[2]);

    let d = new Date(date);

    let startEid = new Date("2025-04-10");
    let endEid = new Date("2025-04-30");

    let quota;

    if(d >= startEid && d <= endEid){
        quota = 6*3600;
    }else{
        quota = 8*3600 + 24*60;
    }

    return active >= quota;
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
    
    let fileData = fs.readFileSync(textFile, "utf8").trim();
    let lines = fileData ? fileData.split("\n") : [];

   
    for(let line of lines){
        let cols = line.split(",");
        if(cols[0].trim() === shiftObj.driverID.trim() && cols[2].trim() === shiftObj.date.trim()){
            return {}; // duplicate found
        }
    }

  
    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let quotaMet = metQuota(shiftObj.date, activeTime);

    let newRecord = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: quotaMet,
        hasBonus: false
    };

 
    let newLine = [
        newRecord.driverID,
        newRecord.driverName,
        newRecord.date,
        newRecord.startTime,
        newRecord.endTime,
        newRecord.shiftDuration,
        newRecord.idleTime,
        newRecord.activeTime,
        newRecord.metQuota,
        newRecord.hasBonus
    ].join(",");

    
    let insertIndex = lines.length; 
    for(let i = lines.length-1; i >=0; i--){
        if(lines[i].split(",")[0].trim() === shiftObj.driverID.trim()){
            insertIndex = i+1;
            break;
        }
    }

    lines.splice(insertIndex, 0, newLine); 
    fs.writeFileSync(textFile, lines.join("\n"), "utf8");

    return newRecord;
}


// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
     let data = fs.readFileSync(textFile, "utf8").trim();
    if(!data) return;

    let lines = data.split("\n");

    for(let i=0; i<lines.length; i++){
        let cols = lines[i].split(",");
        if(cols[0].trim() === driverID.trim() && cols[2].trim() === date.trim()){
            cols[9] = newValue; // hasBonus column
            lines[i] = cols.join(",");
            break;
        }
    }

    fs.writeFileSync(textFile, lines.join("\n"), "utf8");
}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    let data = fs.readFileSync(textFile, "utf8").trim();
    if(!data) return -1;

    let lines = data.split("\n");
    let count = 0;
    let driverExists = false;

    for(let line of lines){
        let cols = line.split(",");
        if(cols[0].trim() === driverID.trim()){
            driverExists = true;
            let lineMonth = new Date(cols[2].trim()).getMonth()+1; // month 1–12
            if(lineMonth === Number(month) && cols[9].trim() === "true") count++;
        }
    }

    return driverExists ? count : -1;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let data = fs.readFileSync(textFile, "utf8").trim();
    if(!data) return "0:00:00";

    let lines = data.split("\n");
    let totalSec = 0;

    for(let line of lines){
        let cols = line.split(",");
        if(cols[0].trim() === driverID.trim()){
            let lineMonth = new Date(cols[2].trim()).getMonth()+1;
            if(lineMonth === Number(month)){
                let t = cols[7].trim().split(":");
                totalSec += Number(t[0])*3600 + Number(t[1])*60 + Number(t[2]);
            }
        }
    }

    return secToTime(totalSec);
}
// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
    
    let shiftData = fs.readFileSync(textFile, "utf8").trim();
    let rateData = fs.readFileSync(rateFile, "utf8").trim();

    if(!shiftData || !rateData) return "0:00:00";

    // get driver dayOff
    let dayOff;
    let rates = rateData.split("\n");
    for(let line of rates){
        let cols = line.split(",");
        if(cols[0].trim() === driverID.trim()){
            dayOff = cols[1].trim();
            break;
        }
    }

    if(!dayOff) return "0:00:00";

    let totalSec = 0;
    let shifts = shiftData.split("\n");
    for(let line of shifts){
        let cols = line.split(",");
        if(cols[0].trim() !== driverID.trim()) continue;

        let d = new Date(cols[2].trim());
        let dayName = d.toLocaleString("en-US", {weekday:"long"});

        if(dayName === dayOff) continue; // skip day off

        // quota
        let quotaSec;
        if(d >= new Date("2025-04-10") && d <= new Date("2025-04-30")){
            quotaSec = 6*3600;
        } else {
            quotaSec = 8*3600 + 24*60; // 8:24:00
        }

        totalSec += quotaSec;
    }

    totalSec -= bonusCount * 2 * 3600; // reduce 2h per bonus
    if(totalSec < 0) totalSec = 0;

    return secToTime(totalSec);
}


// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
    let rateData = fs.readFileSync(rateFile,"utf8").trim();
    let basePay, tier;

    let lines = rateData.split("\n");
    for(let line of lines){
        let cols = line.split(",");
        if(cols[0].trim() === driverID.trim()){
            basePay = Number(cols[2]);
            tier = Number(cols[3]);
            break;
        }
    }

    if(basePay === undefined) return 0;

    // tier allowances
    let allowed = [0,50,20,10,3]; // index = tier
    let allowHours = allowed[tier];

    // convert hours to seconds
    function hmsToSec(t){
        let [h,m,s] = t.split(":").map(Number);
        return h*3600 + m*60 + s;
    }

    let actualSec = hmsToSec(actualHours);
    let requiredSec = hmsToSec(requiredHours);

    let missingSec = requiredSec - actualSec;
    if(missingSec <= 0) return basePay;

    let missingHours = Math.floor(missingSec/3600) - allowHours;
    if(missingHours < 0) missingHours = 0;

    let deductionRate = Math.floor(basePay / 185);
    let salaryDeduction = missingHours * deductionRate;

    return basePay - salaryDeduction;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
