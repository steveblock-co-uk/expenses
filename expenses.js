// persist rules in URL
// quick-create rule from group
// handle conflicting rules

var MIN_SUBSTRING_LENGTH = 8;

function Transaction(date, description, credit, debit) {
  this.date_ = date;
  this.description_ = description;
  this.credit_ = credit;
  this.debit_ = debit;
}

Transaction.prototype.getDate = function() {
  return this.date_;
};

Transaction.prototype.getDescription = function() {
  return this.description_;
};

Transaction.prototype.getCredit = function() {
  return this.credit_;
};

Transaction.prototype.getDebit = function() {
  return this.debit_;
};

Transaction.prototype.getTotal = function() {
  return this.credit_ - this.debit_;
};


function filter(x) {
  var filters = [
    /\bINTERAC E-TRANSFER\b/g,
    /\bDEPOSIT\b/g,
    /\bEB BILL PYMT\b/g,
    /\bPOS PURCHASE\b/g,
    /\bPOS RETURN\b/g,
    /\bTRANSFER\b/g,
    /\bFROM\b/g,
    /\bPRE-AUTH PYMT\b/g,
    /\bSTANDING INST\b/g,
    /\bCHEQUE\b/g,
    /\bINTERBANK TRF\b/g,
    /\bHSBC MASTERCARD\b/g,
    /\bVANCOUVER\b/g,
    /\bCHQ\b/g,
    // Long numbers and codes which create false positive matches, so exclude them.
    /[HI]REF -/g,
    /HIB-\b/g,
    /EB[0-9]+/g,
    /ZEFT[0-9]+/g,
    /Y?IB[0-9]+/g,
    /APO[A-Z]?[0-9]+/g,
    /X[0-9]+/g,
    /[0-9#\-\.]/g,
  ];
  for (var i in filters) {
    x = x.replace(filters[i], '');
  }
  return x.replace(/\ +/g, ' ').trim();
}

function trimQuotes(x) {
  return x.replace(/\"/g, '');
}

function absoluteTotalOfTotals(groups) {
  return groups.reduce(function(x, y) { return x + Math.abs(y.getTotal()); }, 0);
}

var grouper = new Grouper(function(transaction) {
  return filter(transaction.getDescription());
}, function(substring) {
  return substring.length;
}, function(groups) {
  var ungrouped = document.getElementById('ungrouped');
  ungrouped.innerHTML = '';

  var heading = createElement('div', 'title');
  heading.appendChild(createDiv('Not Categorised'));
  heading.appendChild(createDiv(formatAmount(absoluteTotalOfTotals(groups))));
  ungrouped.appendChild(heading);

  new ListView(groups, GroupView, ungrouped, false, false);
});

var rules = new Rules();

var matcher = new Matcher(function(matches, ungroupedTransactions) {
  var categories = document.getElementById('categories');
  categories.innerHTML = '';

  var heading = createElement('div', 'title');
  heading.appendChild(createDiv('Categorised'));
  heading.appendChild(createDiv(formatAmount(absoluteTotalOfTotals(matches))));
  categories.appendChild(heading);

  new ListView(matches, GroupView, categories, false, true);
  grouper.group(ungroupedTransactions);
});

function ListView(items, viewClass, container, isCollapsible, additionalArgs) {
  this.isExpanded_ = !isCollapsible;
  var outer = createElement('div', 'listView');
  var list = createElement('ul');
  list.className = this.isExpanded_ ? "" : 'hidden';
  items.forEach(function(item) {
    var listItem = createElement('li');
    new viewClass(item, listItem, additionalArgs);
    list.appendChild(listItem);
  });
  if (isCollapsible) {
    var details = createElement('a');
    details.href = '#';
    details.textContent = 'details ...';
    details.addEventListener('click', function(e) {
      this.isExpanded_ = !this.isExpanded_;
      list.className = this.isExpanded_ ? "" : 'hidden';
      e.preventDefault();
    }.bind(this));
    outer.appendChild(details);
  }
  outer.appendChild(list);
  container.appendChild(outer);
}

function handleFiles(files) {
  var fileReader = new FileReader();
  fileReader.readAsText(files[0]);
  fileReader.onload = function(event) {
    var lines = event.target.result.split('\n');
    var transactions = [];
    for (var i in lines) {
      if (lines[i] === '') continue;
      // Remove quoted commas then split on commas
      var fields = lines[i].replace(/"([0-9]{1,3})(,([0-9]{3}))(\.[0-9]{2})"/g,'"$1$3$4"').split(',');
      transactions.push(new Transaction(
          fields[0],
          fields[1],
          fields[3] === '' ? 0 : parseFloat(trimQuotes(fields[3])),
          fields[2] === '' ? 0 : parseFloat(trimQuotes(fields[2]))));
    }
    matcher.setTransactions(transactions);
    matcher.match(rules.get());
  }
}

function getValues(object) {
  return Object.keys(object).map(function(key) { return object[key]; });
}

function getLongestCommonSubstring(x, y) {
  var maxSubstringLength = 0;
  var maxSubstringStartIndex;
  for (var yIndexOffset = 1 - y.length; yIndexOffset < x.length; ++yIndexOffset) {
    var startIndex = Math.max(0, yIndexOffset);
    var endIndex = Math.min(x.length, y.length + yIndexOffset);
    var substringStartIndex = startIndex;
    var substringLength = 0;
    for (var index = startIndex; index < endIndex; ++index) {
      var charactersMatch = x[index] === y[index - yIndexOffset];
      if (charactersMatch) {
        ++substringLength;
      }
      if (!charactersMatch || index === endIndex - 1) {
        if (substringLength > maxSubstringLength) {
          maxSubstringLength = substringLength;
          maxSubstringStartIndex = substringStartIndex;
        }
        substringStartIndex = index + 1;
        substringLength = 0;
      }
    }
  }
  return x.substr(maxSubstringStartIndex, maxSubstringLength);
}

// To be used with Array.filter.
function filterUnique(value, index, self) { 
    return self.indexOf(value) === index;
}

// getter is a function which gets the string for comparing from an item.
// heuristic maps from a substring to a numerical value
function Grouper(getter, heuristic, onchange) {
  this.getter_ = getter;
  this.heuristic_ = heuristic;
  this.onchange_ = onchange;
}

Grouper.prototype.group = function(items) {

  // Get maximum substring for every pair of items, then build map of substring to list of IDs. Note that each ID may
  // appear for multiple substrings, and may appear multiple times for each substring.
  var substringToItemIds = {};
  for (var i1 in items) {
    var string1 = this.getter_(items[i1]);
    for (var i2 in items) {
      if (i1 === i2) {
        continue;
      }
      var string2 = this.getter_(items[i2]);
      var substring = getLongestCommonSubstring(string1, string2).trim();
      if (substring === '') {
        continue;
      }

      if (substringToItemIds[substring] === undefined) {
        substringToItemIds[substring] = [];
      }
      substringToItemIds[substring].push(i1);
      substringToItemIds[substring].push(i2);
    }
  }

  // Sort substrings by heuristic and remove those below a threshold.
  var substrings = Object.keys(substringToItemIds).filter(function(substring) {
    return substring.length >= MIN_SUBSTRING_LENGTH;
  }).sort(function(x, y) {
    return this.heuristic_(y) - this.heuristic_(x);
  }.bind(this));

  // Assign items to groups, with matches with largest heuristics taking priority.
  var itemIdToSubstringId = [];
  substrings.forEach(function(substring, substringIndex) {
    // Remove duplicate item IDs.
    var itemIds = substringToItemIds[substring].filter(filterUnique);

    console.assert(itemIds.length > 1);
    var unassignedItemIds = itemIds.filter(function(id) {
      return itemIdToSubstringId[id] == undefined;
    });

    // If there's only one unused ID for this substring, don't assign it as a group. This ID may be added to a group
    // for a later substring. This means that some substring IDs may be unused.
    if (unassignedItemIds.length < 2) {
      return;
    }
    unassignedItemIds.forEach(function(unassignedId) {
      itemIdToSubstringId[unassignedId] = substringIndex;
    });
  });

  // Create singleton groups for ungrouped items.
  var nextGroupId = substrings.length;
  for (var i in items) {
    if (itemIdToSubstringId[i] === undefined) {
      itemIdToSubstringId[i] = nextGroupId++;
    }
  }

  // Build groups.
  // TODO: Shouldn't assume group
  var substringIdToGroup = {};
  for (var i in items) {
    var substringId = itemIdToSubstringId[i];
    if (substringIdToGroup[substringId] == undefined) {
      substringIdToGroup[substringId] = new Group(substrings[substringId]);
    }
    substringIdToGroup[substringId].addTransaction(items[i]);
  }

  // Sort groups by descending total value.
  // TODO: Pass in sorter
  var groups = Object.keys(substringIdToGroup).map(function(substringId) {
    return substringIdToGroup[substringId];
  }).sort(function(x, y) {
    return Math.abs(y.getTotal()) - Math.abs(x.getTotal());
  });

  this.onchange_(groups);
}

function Group(name) {
  this.name_ = name;
  this.transactions_ = [];
  this.credit_ = 0;
  this.debit_ = 0;
}

Group.prototype.addTransaction = function(transaction) {
  this.transactions_.push(transaction);
  this.credit_ += transaction.getCredit();
  this.debit_ += transaction.getDebit();
};

Group.prototype.getName = function() {
  return this.name_;
};

Group.prototype.getTransactions = function() {
  return this.transactions_;
};

Group.prototype.getCredit = function() {
  return this.credit_;
};

Group.prototype.getTotal = function() {
  return this.credit_ - this.debit_;
};

Group.prototype.getTotal = function() {
  return this.credit_ - this.debit_;
};

// onchange is called with groups and ungrouped transactions
function Matcher(onchange) {
  this.onchange_ = onchange;
  this.transactions_ = [];
}

Matcher.prototype.setTransactions = function(transactions) {
  this.transactions_ = transactions;
};

Matcher.prototype.match = function(rules) {
  var transactionIdToRule = {};
  rules.forEach(function(rule) {
    this.transactions_.forEach(function(transaction, transactionId) {
      if (!rule.matches(transaction)) {
        return;
      }
      if (transactionIdToRule[transactionId] !== undefined) {
        throw ("Multiple matches: " + transaction.getDescription() + " : " + rule.toString() + " conflicts with " + transactionIdToRule[transactionId].toString());
      }
      transactionIdToRule[transactionId] = rule;
    });
  }.bind(this));

  var unmatchedTransactions = [];
  var categoryToGroup = {};
  this.transactions_.forEach(function(transaction, transactionId) {
    var rule = transactionIdToRule[transactionId];
    if (rule === undefined) {
      unmatchedTransactions.push(transaction);
      return;
    }
    if (categoryToGroup[rule.getCategory()] === undefined) {
      categoryToGroup[rule.getCategory()] = new Group(rule.getCategory());
    }
    categoryToGroup[rule.getCategory()].addTransaction(transaction);
  });

  var matches = Object.keys(categoryToGroup).map(function(category) {
    return categoryToGroup[category];
  }).sort(function(x, y) {
    return Math.abs(y.getTotal()) - Math.abs(x.getTotal());
  });
  this.onchange_(matches, unmatchedTransactions);
}

function Rule(regex, amount, category) {
  this.regex_ = regex;
  this.amount_ = amount;
  this.category_ = category;
}

Rule.prototype.toString = function() {
  return '{regex: ' + this.regex_ + ', amount: ' + this.amount_ + ', category: ' + this.category_ + '}';
}

Rule.prototype.matches = function(transaction) {
  var regexMatches = this.regex_ === null || new RegExp(this.regex_).test(transaction.getDescription());
  var amountMatches = this.amount_ === null || this.amount_ === transaction.getTotal();
  return regexMatches && amountMatches;
}

Rule.prototype.getRegex = function() {
  return this.regex_;
}

Rule.prototype.getAmount = function() {
  return this.amount_;
}

Rule.prototype.getCategory = function() {
  return this.category_;
}

// TODO: Improve this
Rule.prototype.getHash = function() {
  return this.regex_ + '|' + this.amount_;
}

function Rules() {
  this.map_ = {};
}

Rules.prototype.add = function(regex, amount, category) {
  var rule = new Rule(regex, amount, category);
  this.map_[rule.getHash()] = rule;
  if (this.onchange_ !== undefined) {
    this.onchange_();
  }
}

Rules.prototype.remove = function(rule) {
  delete this.map_[rule.getHash()];
  if (this.onchange_ !== undefined) {
    this.onchange_();
  }
}

Rules.prototype.get = function() {
  return getValues(this.map_);
}

Rules.prototype.setOnchange = function(onchange) {
  console.assert(this.onchange === undefined);
  this.onchange_ = onchange;
}

function createElement(name, clazz) {
  var element = document.createElement(name);
  if (clazz !== undefined) {
    element.className = clazz;
  }
  return element;
}

function createSpan(x, clazz) {
  var span = createElement('span', clazz);
  span.textContent = x;
  return span;
}

function createDiv(x, clazz) {
  var div = createElement('div', clazz);
  div.textContent = x;
  return div;
}

function formatAmount(x) {
  var s = x.toFixed(2);
  return Object.keys(s).map(function(index) {
    var y = s.length - index;
    return (s[index - 1] !== '-' && index != 0 && y > 3 && (y - 6) % 3 === 0) ? ',' + s[index] : s[index];
  }).join('');
}

function TransactionView(item, container) {
  var div = createElement('div', 'transaction');
  div.appendChild(createDiv(item.getDate()));
  div.appendChild(createDiv(item.getDescription()));
  div.appendChild(createDiv(formatAmount(item.getCredit())));
  div.appendChild(createDiv(formatAmount(item.getDebit())));
  container.appendChild(div);
}

function GroupView(group, container, isCollapsible) {
  var div = createElement('div', 'group listItem');
  var heading = createElement('div', 'heading');
  heading.appendChild(createDiv(group.getName()));
  heading.appendChild(createDiv(formatAmount(group.getTotal())));
  div.appendChild(heading);
  new ListView(group.getTransactions(), TransactionView, div, isCollapsible);
  container.appendChild(div);
}

function RuleView(rule, container, rules) {
  var div = createElement('div', 'rule listItem');
  div.appendChild(createDiv(rule.getRegex() === null ? '' : '/' + rule.getRegex() + '/'));
  div.appendChild(createDiv(rule.getAmount() === null ? '' : '$' + formatAmount(rule.getAmount())));
  div.appendChild(createDiv(rule.getCategory()));
  var remove = createElement('a');
  remove.addEventListener('click', function() { rules.remove(rule) });
  div.appendChild(remove);
  container.appendChild(div);
}

function RulesView(rules, container) {
  this.rules_ = rules;
  this.container_ = container;
  rules.setOnchange(function() {
   this.container_.innerHTML = '';
   new ListView(this.rules_.get().reverse(), RuleView, this.container_, false, rules);
   matcher.match(rules.get());
  }.bind(this));
}

function onload() {

  var rulesDiv = document.getElementById('rules');

  var heading = createElement('div', 'title');
  heading.appendChild(createDiv('Rules'));
  rulesDiv.appendChild(heading);

  new AddRuleView(rulesDiv, rules);

  var ruleList = createElement('div');
  ruleList.id = 'ruleList';
  document.getElementById('rules').appendChild(ruleList);

  new RulesView(rules, ruleList);
rules.add('Steve monthly jnt float', null, 'In');
rules.add('Steph.*Joint', null, 'In');
rules.add('STEPH 2 JOINT', null, 'In');

rules.add('INTERBANK TRF', 25000, 'Steph\'s Mum');
rules.add('FR MS ANNE C WATERMAN', null, 'Steph\'s Mum');

rules.add('THE HOME DEPOT', null, 'DIY');
rules.add('CANADIAN TIRE', null, 'DIY');
rules.add('RONA HOME', null, 'DIY');
rules.add('Plumber', null, 'DIY');
rules.add('Feeny Power', null, 'DIY');
rules.add('ANDREW SHERET LIMITED', null, 'DIY');

rules.add('MARKETPLACE +IGA', null, 'Food');
rules.add('REAL CDN\.? SUPERSTORE', null, 'Food');
rules.add('CHOICES YALETOWN', null, 'Food');
rules.add('SAVE ON FOODS', null, 'Food');
rules.add('FARM MARKET', null, 'Food');
rules.add('URBAN FARE', null, 'Food');
rules.add('HSBC MASTERCARD. Superstore', null, 'Food');
rules.add('FOOD MAR', null, 'Food');
rules.add('THRIFTY FOODS', null, 'Food');
rules.add('GROCERY', null, 'Food');
rules.add('SAFEWAY', null, 'Food');

rules.add('ABM CASH W/D', null, 'Cash');
rules.add('ATM REBATE', null, 'Cash');

rules.add('CHEVRON', null, 'Gas');
rules.add('HUSKY', null, 'Gas');
rules.add('PETRO-CANADA', null, 'Gas');
rules.add('GAS BAR', null, 'Gas');

rules.add('CHEQUE', -1425.00, 'Sweet Peas');
rules.add('CHEQUE', -1045.00, 'Sweet Peas');
rules.add('KIDS &\. COMPANY', null, 'Kids & Company');
rules.add('MAHNAZ', null, 'Mahnaz');

rules.add('CHEQUE', -2400.00, 'Rolston Rent');
rules.add('CHQ FR NEIL CHANDHO', 1200.00, 'Rolston Rent');

rules.add('COMPASS VENDING', null, 'Compass');
rules.add('Compass', null, 'Compass');

rules.add('LOAN PAYMENT', null, 'Mortgage');
rules.add('EMPOYEE HOUSING ASSI', null, 'Mortgage Assistance');
rules.add('VIRGIN MOB', null, 'Phone');
rules.add('Internet( set up)?\.', null, 'Internet');
rules.add('FortisBC Energy', null, 'Gas');
rules.add('B\.?C\.? HYDRO', null, 'Electricity');
rules.add('PAYPAL', -7.99, 'Netflix');

rules.add('IKEA', null, 'Furniture');
rules.add('David Gilman and Joanne', -805.00, 'Furniture');

rules.add('NORTH VAN TAX', null, 'Property Tax');
rules.add('CRA TAX OWING', null, 'CRA');
rules.add('MFDAC:6180418 PURPAH', null, 'RESP');
rules.add('House insurance', null, 'House Insurace');
rules.add('Subaru insurance', null, 'Car Insurance');
}

function AddRuleView(container, rules) {
  var regexInput = document.createElement('input');
  var amountInput = document.createElement('input');
  var categoryInput = document.createElement('input');
  var div = createElement('div', 'rule listItem addRule');
  var regex = createElement('div');
  regex.appendChild(createSpan('/'));
  regex.appendChild(regexInput);
  regex.appendChild(createSpan('/'));
  var amount = createElement('div');
  amount.appendChild(createSpan('$'));
  amount.appendChild(amountInput);
  var category = createElement('div');
  category.appendChild(categoryInput);
  var add = createElement('a');
  var enable = function() {
    // TODO
    add.enabled = (regexInput.value !== '' || amountInput.value !== '') && categoryInput.value !== '';
  };
  regexInput.addEventListener('change', enable);
  amountInput.addEventListener('change', enable);
  categoryInput.addEventListener('change', enable);
  add.addEventListener('click', function() {
    rules.add(
        regexInput.value === '' ? null : regexInput.value,
        amountInput.value === '' ? null : parseFloat(amountInput.value),
        categoryInput.value);
    regexInput.value = '';
    amountInput.value = '';
    categoryInput.value = '';
  });
  div.appendChild(regex);
  div.appendChild(amount);
  div.appendChild(category);
  div.appendChild(add);
  container.appendChild(div);
}
