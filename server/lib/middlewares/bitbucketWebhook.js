import ipChecker from 'ip';
import {ArgumentError, UnauthorizedError} from '../errors';

const bitbucketIps = [
  ipChecker.cidrSubnet('131.103.20.160/27'),
  ipChecker.cidrSubnet('165.254.145.0/26'),
  ipChecker.cidrSubnet('104.192.143.0/24')
];

const parse = (headers, {push = {}, repository = {}, actor = {}}) => {
  if (push.changes && push.changes.length > 0 && push.changes[0].new) {
    const details = push.changes[0].new;
    let diff = null;
    if (push.changes[0].links && push.changes[0].links.diff)
      diff = push.changes[0].links.diff.href.split('/').pop();
    return {
      id: headers['x-hook-uuid'],
      event: headers['x-event-key'],
      branch: (details.type === 'branch' || details.type === 'named_branch') ? details.name : '',
      commits: push.changes[0].commits,
      repository: repository.full_name,
      user: actor.display_name,
      diff: diff,
      sha: details.target.hash
    };
  } else {
    return {
      id: headers['x-hook-uuid'],
      event: headers['x-event-key'],
      branch: '',
      commits: [],
      repository: repository.full_name,
      user: actor.display_name,
      sha: '',
      diff: ''
    }
  }
};

const getIpInRange = (currIp) =>
  bitbucketIps.filter(mask => mask.contains(currIp)).length;

module.exports = () => (req, res, next) => {
  if (!req.headers['x-hook-uuid']) {
    return next(new ArgumentError('The Bitbucket delivery identifier is missing.'));
  }
  if (!req.headers['x-event-key']) {
    return next(new ArgumentError('The Bitbucket event name is missing.'));
  }
  if (!getIpInRange(req.headers['x-forwarded-for'])) {
    return next(new ArgumentError('The Bitbucket delivery ip is not correct.'));
  }

  req.webhook = parse(req.headers, req.body);
  return next();
};
