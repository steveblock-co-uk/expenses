// Sample URL: file:///Users/blosteve/Desktop/Personal/Code/expenses/expenses.html#Steve%20monthly%20jnt%20float%7C%7CIgnored%23Steph.*Joint%7C%7CIgnored%23STEPH%202%20JOINT%7C%7CIgnored%23HSBC%20MASTERCARD%7C%7CIgnored%23IKEA%7C%7CHome%20improvement%23THE%20HOME%20DEPOT%7C%7CHome%20improvement%23CANADIAN%20TIRE%7C%7CHome%20improvement%23RONA%20HOME%7C%7CHome%20improvement%23MARKETPLACE%20%2BIGA%7C%7CFood%23REAL%20CDN.%3F%20SUPERSTORE%7C%7CFood%23CHOICES%20YALETOWN%7C%7CFood%23SAVE%20ON%20FOODS%7C%7CFood%23FARM%20MARKET%7C%7CFood%23URBAN%20FARE%7C%7CFood%23FOOD%20MAR%7C%7CFood%23THRIFTY%20FOODS%7C%7CFood%23GROCERY%7C%7CFood%23SAFEWAY%7C%7CFood%23CHEVRON%7C%7CGas%23HUSKY%7C%7CGas%23PETRO-CANADA%7C%7CGas%23GAS%20BAR%7C%7CGas%23CHEQUE%7C-1425%7CSweet%20Peas%23CHEQUE%7C-1045%7CSweet%20Peas%23LOAN%20PAYMENT%7C%7CMortgage%23EMPOYEE%20HOUSING%20ASSI%7C%7CMortgage%23VIRGIN%20MOB%7C%7CUtilities%23FortisBC%20Energy%7C%7CUtilities%23B.%3FC.%3F%20HYDRO%7C%7CUtilities%23PAYPAL%7C-7.99%7CUtilities%23MFDAC%3A6180418%20PURPAH%7C%7CRESP%23NORTH%20VAN%20TAX%7C%7CProperty%20tax%23CHQ%20FR%20NEIL%20CHANDHO.%20K.%7C%7CIgnored%23David%20Gilman%20and%20Joanne%7C%7CHouse%20one-off%23CHQ%20FM%20MAHNAZ.%20ESFAHANI%7C%7CIgnored%23Feeny%20Power%7C%7CHouse%20one-off%23COMPASS%20VENDING%7C%7CCompass%23Steph's%20CC%7C%7CIgnored%23MICHAELS%7C%7CHome%20improvement

// TODO
// quick-create rule from group

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

function sumOfTotals(groups) {
  return groups.reduce(function(x, y) { return x + y.getTotal(); }, 0);
}

function sumOfAbsoluteTotals(groups) {
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
  var totals = createElement('div');
  totals.appendChild(createDiv('Total ' + formatAmount(sumOfTotals(groups))));
  totals.appendChild(createDiv('Abs Total ' + formatAmount(sumOfAbsoluteTotals(groups))));
  heading.appendChild(totals);
  ungrouped.appendChild(heading);

  new ListView(groups, GroupView, ungrouped, false, false);
});

var matcher = new Matcher(function(matches, ungroupedTransactions) {
  var categories = document.getElementById('categories');
  categories.innerHTML = '';

  var heading = createElement('div', 'title');
  heading.appendChild(createDiv('Categorised'));
  var totals = createElement('div');
  totals.appendChild(createDiv('Total ' + formatAmount(sumOfTotals(matches))));
  totals.appendChild(createDiv('Abs Total ' + formatAmount(sumOfAbsoluteTotals(matches))));
  heading.appendChild(totals);
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

function FileArray(onchange) {
  this.files_ = [];
  this.onchange_ = onchange;
}

FileArray.prototype.getOnchange = function() {
  return this.onchange_;
};

FileArray.prototype.setOnchange = function(onchange) {
  this.onchange_ = onchange;
};

FileArray.prototype.add = function(files) {
  files.forEach(function(file) {
    this.files_.push(file);
  }.bind(this));
  if (this.onchange_) {
    this.onchange_(this.files_);
  }
};

FileArray.prototype.remove = function(index) {
  this.files_.splice(index, 1);
  if (this.onchange_) {
    this.onchange_(this.files_);
  }
};

function parseFloatStrict(x) {
  var float = x * 1;
  if (float === NaN) {
    throw (x + ' is not a float');
  }
  return float;
}

var fileArray = new FileArray(function(files) {
  var transactions = [];
  var numFilesRemaining = files.length;
  if (numFilesRemaining === 0) {
    matcher.setTransactions(transactions);
    matcher.match(rules.get());
    return;
  }
  files.forEach(function(file) {
    var fileReader = new FileReader();
    fileReader.onload = function(event) {
      var lines = event.target.result.split('\n');
      for (var i in lines) {
        if (lines[i] === '') continue;
        // Remove quotes and commas from quoted numeric values, then split on commas.
        var fields = lines[i].replace(/"(-?[0-9]{1,3})(,([0-9]{3}))*(\.[0-9]{2})"/g,'$1$3$4').split(',');
        var amount = parseFloatStrict(fields[2]);
        transactions.push(new Transaction(
            fields[0],
            fields[1].trim(),
            amount > 0 ? amount : 0,
            amount < 0 ? -amount : 0));
      }
      if (--numFilesRemaining === 0) {
        matcher.setTransactions(transactions);
        matcher.match(rules.get());
      }
    };
    fileReader.readAsText(file);
   });
});


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
      var existingRule = transactionIdToRule[transactionId];
      if (existingRule !== undefined && existingRule.getCategory() !== rule.getCategory()) {
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
    var category = rule.getCategory();
    if (category === '') {
      return;
    }
    if (categoryToGroup[category] === undefined) {
      categoryToGroup[category] = new Group(category);
    }
    categoryToGroup[category].addTransaction(transaction);
  });

  var matches = Object.keys(categoryToGroup).map(function(category) {
    return categoryToGroup[category];
  }).sort(function(x, y) {
    return Math.abs(y.getTotal()) - Math.abs(x.getTotal());
  });
  this.onchange_(matches, unmatchedTransactions);
}

function Rule(regex, amount, category) {
  console.assert(regex === null || (typeof regex === 'string' && regex !== '' && regex.indexOf(Rule.DELIM) === -1));
  console.assert(amount === null || typeof amount === 'number');
  console.assert(typeof category === 'string' && category.indexOf(Rule.DELIM) === -1);
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

Rule.DELIM = '|';

function emptyIfNull(x) {
  return x === null ? '' : x;
}

Rule.prototype.serialize = function() {
  return emptyIfNull(this.regex_) + Rule.DELIM + emptyIfNull(this.amount_) + Rule.DELIM + this.category_;
}

function nullIfEmpty(x) {
  console.assert(x !== null);
  return x === '' ? null : x
}

Rule.deserialize = function(serializedString) {
  var components = serializedString.split(Rule.DELIM);
  var regex = nullIfEmpty(components[0]);
  var amount= nullIfEmpty(components[1]);
  amount = amount === null ? null : parseFloat(amount);
  var category = components[2];
  return new Rule(regex, amount, category);
}

function Rules() {
  this.map_ = {};
}

Rules.ruleInputHash = function(rule) {
  return rule.getRegex() + '|' + rule.getAmount();
}

Rules.prototype.add = function(rule) {
  this.map_[Rules.ruleInputHash(rule)] = rule;
  if (this.onchange_ !== undefined) {
    this.onchange_();
  }
}

Rules.prototype.remove = function(rule) {
  delete this.map_[Rules.ruleInputHash(rule)];
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

function FileArrayView(fileArray, container) {
  this.fileArray_ = fileArray;
  var originalOnchange = fileArray.getOnchange();
  this.fileArray_.setOnchange(function(files) {
    this.onchange_(files);
    if (originalOnchange) {
      originalOnchange(files);
    }
  }.bind(this));
  var input = createElement('input');
  input.style = 'display: none';
  input.type = 'file';
  input.multiple = true;
  input.onchange = function() {
    // The this object is the input element.
    var files = [];
    for (var i = 0; i < this.files.length; ++i) {
      files.push(this.files[i]);
    }
    fileArray.add(files);
  };
  container.appendChild(createSpan('Input Files'));
  container.appendChild(input);
  var button = document.createElement('button');
  button.appendChild(createSpan('Browse'));
  button.onclick = function() { input.click(); };
  container.appendChild(button);
  this.summary_ = document.createElement('div');
  container.appendChild(this.summary_);
  this.more_ = document.createElement('a');
  container.appendChild(this.more_);
  this.listContainer_ = createElement('ol');
  container.appendChild(this.listContainer_);
  this.show_();
  this.onchange_([]);
}

FileArrayView.prototype.hide_ = function() {
  this.listContainer_.style = 'overflow: hidden; height: 0px';
  this.more_.style = 'transform: rotate(180deg)';
  this.more_.onclick = this.show_.bind(this);
};

FileArrayView.prototype.show_ = function() {
  this.listContainer_.style = 'height: auto';
  this.more_.style = 'transform: rotate(0deg)';
  this.more_.onclick = this.hide_.bind(this);
};

FileArrayView.prototype.onchange_ = function(files) {
  this.summary_.textContent = files.length + ' files';
  this.listContainer_.innerHTML = '';
  files.forEach(function(file, index) {
    var div = createElement('li', 'file');
    var remove = createElement('a');
    remove.addEventListener('click', function() {
      this.fileArray_.remove(index);
    }.bind(this));
    div.appendChild(remove);
    div.appendChild(createSpan(file.name));
    this.listContainer_.appendChild(div);
  }.bind(this));
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
  this.rules_.setOnchange(this.update.bind(this));
  this.update();
}

RulesView.prototype.update = function() {
 this.container_.innerHTML = '';
 new ListView(this.rules_.get().reverse(), RuleView, this.container_, false, rules);
 matcher.match(rules.get());
 updateHash();
};

var rules = new Rules();

function onload() {

  var rulesDiv = document.getElementById('rules');

  var heading = createElement('div', 'title');
  heading.appendChild(createDiv('Rules'));
  rulesDiv.appendChild(heading);

  new AddRuleView(rulesDiv, rules);

  var ruleList = createElement('div');
  ruleList.id = 'ruleList';
  document.getElementById('rules').appendChild(ruleList);

  if (location.hash !== '') {
    decodeURIComponent(location.hash.substring(1)).split('#').map(Rule.deserialize).forEach(function(rule) {
      rules.add(rule);
    });
  }
  new RulesView(rules, ruleList);

  new FileArrayView(fileArray, document.getElementById('file_list'));
}

function updateHash() {
  var rulesHash = rules.get().map(function(rule) {
    console.assert(rule.serialize().indexOf('#') === -1);
    return rule.serialize();
  }).join('#');
  location.hash = encodeURIComponent(rulesHash);
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
    rules.add(new Rule(
        regexInput.value === '' ? null : regexInput.value,
        amountInput.value === '' ? null : parseFloat(amountInput.value),
        categoryInput.value));
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
