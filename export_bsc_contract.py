import json,sys
print(json.loads(open('./deploy_contract/build/contracts/ProofOfPromise.json').read())['metadata'])