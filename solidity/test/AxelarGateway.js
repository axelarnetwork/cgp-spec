const { sortBy, get } = require('lodash');
const chai = require('chai');
const { ethers, network } = require('hardhat');
const {
    utils: { arrayify, id, keccak256, defaultAbiCoder },
} = ethers;
const { expect } = chai;

describe('AxelarGateway', () => {
    const threshold = 4;

    let wallets;
    let user;
    let operators;
    let weights;

    let gatewayFactory;
    let authFactory;

    let auth;
    let gateway;

    before(async () => {
        wallets = await ethers.getSigners();
        user = wallets[0];
        operators = sortBy(wallets.slice(0, threshold), (wallet) => wallet.address.toLowerCase());
        weights = Array(operators.length).fill(1);

        gatewayFactory = await ethers.getContractFactory('AxelarGateway', user);
        authFactory = await ethers.getContractFactory('AxelarAuthWeighted', user);
    });

    const deployGateway = async () => {
        // setup auth contract with a genesis operator set
        auth = await authFactory
            .deploy(getWeightedAuthDeployParam(
                [operators],
                [weights],
                [threshold],
            )).then((d) => d.deployed());

        gateway = await gatewayFactory.deploy(auth.address).then((d) => d.deployed());

        await auth.transferOwnership(gateway.address).then((tx) => tx.wait());
    };

    describe('call contract', () => {
        beforeEach(async () => {
            await deployGateway();
        });

        it('should emit contract call event', async () => {
            const destinationChain = "Destination";
            const destinationAddress = "0x123abc";
            const payload = defaultAbiCoder.encode(['address'], [user.address]);

            const tx = await gateway.connect(user).callContract(destinationChain, destinationAddress, payload);

            expect(tx).to.emit(gateway, 'ContractCall').withArgs(user.address, destinationChain, destinationAddress, keccak256(payload), payload);
        });

        it('should approve and validate contract call', async () => {
            const payload = defaultAbiCoder.encode(['address'], [user.address]);
            const payloadHash = keccak256(payload);
            const commandId = getRandomID();
            const sourceChain = 'Source';
            const sourceAddress = 'address0x123';
            const sourceTxHash = keccak256('0x123abc123abc');
            const sourceEventIndex = 17;

            const approveData = buildCommandBatch(
                await getChainId(),
                [commandId],
                ['approveContractCall'],
                [getApproveContractCall(sourceChain, sourceAddress, user.address, payloadHash, sourceTxHash, sourceEventIndex)],
            );

            const approveInput = await getSignedWeightedExecuteInput(
                approveData,
                operators,
                weights,
                threshold,
                operators.slice(0, threshold),
            );

            await expect(gateway.execute(approveInput))
                .to.emit(gateway, 'ContractCallApproved')
                .withArgs(commandId, sourceChain, sourceAddress, user.address, payloadHash, sourceTxHash, sourceEventIndex);

            const isApprovedBefore = await gateway.isContractCallApproved(
                commandId,
                sourceChain,
                sourceAddress,
                user.address,
                payloadHash,
            );

            expect(isApprovedBefore).to.be.true;

            await gateway.connect(user).validateContractCall(commandId, sourceChain, sourceAddress, payloadHash).then((tx) => tx.wait());

            const isApprovedAfter = await gateway.isContractCallApproved(commandId, sourceChain, sourceAddress, user.address, payloadHash);

            expect(isApprovedAfter).to.be.false;
        });
    });

    describe('transfer operatorship', () => {
        beforeEach(async () => {
            await deployGateway();
        });

        it('should allow operators to transfer operatorship', async () => {
            const newOperators = ['0xb7900E8Ec64A1D1315B6D4017d4b1dcd36E6Ea88', '0x6D4017D4b1DCd36e6EA88b7900e8eC64A1D1315b'];

            const data = buildCommandBatch(
                await getChainId(),
                [getRandomID()],
                ['transferOperatorship'],
                [getTransferWeightedOperatorshipCommand(newOperators, getWeights(newOperators), newOperators.length)],
            );

            const input = await getSignedWeightedExecuteInput(
                data,
                operators,
                weights,
                threshold,
                operators.slice(0, threshold),
            );

            const tx = await gateway.execute(input);

            await expect(tx)
                .to.emit(gateway, 'OperatorshipTransferred')
                .withArgs(getTransferWeightedOperatorshipCommand(newOperators, getWeights(newOperators), newOperators.length));
        });
    });
});


// Utils
const getChainId = async () => await network.provider.send('eth_chainId');
const getRandomInt = (max) => {
    return Math.floor(Math.random() * max);
};
const getRandomID = () => id(getRandomInt(1e10).toString());

const getAddresses = (wallets) => wallets.map(({ address }) => address);
const getWeightedAuthDeployParam = (operatorSets, weights, thresholds) => {
    return operatorSets.map((operators, i) =>
        defaultAbiCoder.encode(['address[]', 'uint256[]', 'uint256'], [getAddresses(operators), weights[i], thresholds[i]]),
    );
};
const buildCommandBatch = (chainId, commandIDs, commandNames, commands) =>
    arrayify(defaultAbiCoder.encode(['uint256', 'bytes32[]', 'string[]', 'bytes[]'], [chainId, commandIDs, commandNames, commands]));
const getTransferWeightedOperatorshipCommand = (newOperators, newWeights, threshold) =>
    defaultAbiCoder.encode(
        ['address[]', 'uint256[]', 'uint256'],
        [sortBy(newOperators, (address) => address.toLowerCase()), newWeights, threshold],
    );
const getApproveContractCall = (sourceChain, source, destination, payloadHash, sourceTxHash, sourceEventIndex) =>
    defaultAbiCoder.encode(
        ['string', 'string', 'address', 'bytes32', 'bytes32', 'uint256'],
        [sourceChain, source, destination, payloadHash, sourceTxHash, sourceEventIndex],
    );

const getWeightedSignaturesProof = async (data, operators, weights, threshold, signers) => {
    const hash = arrayify(keccak256(data));
    const signatures = await Promise.all(
        sortBy(signers, (wallet) => wallet.address.toLowerCase()).map((wallet) => wallet.signMessage(hash)),
    );
    return defaultAbiCoder.encode(
        ['address[]', 'uint256[]', 'uint256', 'bytes[]'],
        [getAddresses(operators), weights, threshold, signatures],
    );
};
const getSignedWeightedExecuteInput = async (data, operators, weights, threshold, signers) =>
    defaultAbiCoder.encode(['bytes', 'bytes'], [data, await getWeightedSignaturesProof(data, operators, weights, threshold, signers)]);
const getWeights = ({ length }, weight = 1) => Array(length).fill(weight);
