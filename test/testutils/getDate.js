const getDate = (minOffset, baseDate) => new Date((baseDate || new Date()).getTime() + (minOffset * 1000 * 60)).toISOString();

module.exports = getDate;
