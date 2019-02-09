#include "posl.h"
#include "model.h"
#include "robot.h"
#include "sincos.h"
#include "mtwist.h"
#include "utility.h"
#include "step.h"
#include <stdlib.h>
#include <math.h>

// Data structure instance
struct sPOSL posl;

void posl_init(int particle_count, int target_distance_16b, int target_differential) {
	int i;

	// Particles
	posl.particles.count = particle_count;
	posl.particles.redistribution_index = 0;
	for (i = 0; i < posl.particles.count; i++) {
		posl.particles.item[i].x_16b = (mt_lrand() & HISTOGRAM_SIZE) - (HISTOGRAM_SIZE>>1); // [-2, 2] m
		posl.particles.item[i].y_16b = (mt_lrand() & HISTOGRAM_SIZE) - (HISTOGRAM_SIZE>>1); // [-2, 2] m
		posl.particles.item[i].weight = 0x1000;
	}

	// Targets
	posl.targets.best.index = 0;
	posl.targets.count = 0;

	if (1) {
		// Targets (short list)
		int y;
		for (y = -2; y <= 2; y++) {
			posl.targets.item[posl.targets.count].x_15b = target_distance_16b >> 1;
			posl.targets.item[posl.targets.count].y_15b = (y * target_distance_16b) >> 2;
			posl.targets.item[posl.targets.count].speed_left = ROBOT_MEAN_SPEED - ((ROBOT_DIFFERENTIAL_SPEED * y) >> 1);
			posl.targets.item[posl.targets.count].speed_right = ROBOT_MEAN_SPEED + ((ROBOT_DIFFERENTIAL_SPEED * y) >> 1);
			posl.targets.count++;
			posl.targets.item[posl.targets.count].x_15b = -target_distance_16b >> 1;
			posl.targets.item[posl.targets.count].y_15b = (y * target_distance_16b) >> 2;
			posl.targets.item[posl.targets.count].speed_left = ROBOT_MEAN_SPEED - ((ROBOT_DIFFERENTIAL_SPEED * y) >> 1); //tester en prenant -vitesse
      posl.targets.item[posl.targets.count].speed_right = ROBOT_MEAN_SPEED + ((ROBOT_DIFFERENTIAL_SPEED * y) >> 1); //tester en prenant -vitesse

			posl.targets.count++;
		}
	} else {
		// Targets (long list)
		int x_16b;
		int y_16b;
		for (x_16b = -0x10000; x_16b < 0x10000; x_16b += 0x1000) {
			for (y_16b = -0x10000; y_16b < 0x10000; y_16b += 0x1000) {
				posl.targets.item[posl.targets.count].x_15b = x_16b >> 1;
				posl.targets.item[posl.targets.count].y_15b = y_16b >> 1;
				posl.targets.item[posl.targets.count].speed_left = 15000 + 100;
				posl.targets.item[posl.targets.count].speed_right = 15000 - 100;
				posl.targets.count++;
			}
		}
	}

	// Print number of targets (this has a major impact on the execution time)
	printf("Targets: %d\n", posl.targets.count);
}

// Recenters the particles so that the robot is always around (0, 0)
void posl_particles_recenter() {
	// Only recenter if the robot is too far from (0, 0)
	if ((abs(robot.x_24b) < POSL_MAX_DECENTERED) && (abs(robot.y_24b) < POSL_MAX_DECENTERED)) {	// 0x400000 = 25 cm
		return;
	}

	// Move all particles
	int x_16b = robot.x_24b >> 8;
	int y_16b = robot.y_24b >> 8;
	int i;
	for (i = 0; i < posl.particles.count; i++) {
		posl.particles.item[i].x_16b -= x_16b;
		posl.particles.item[i].y_16b -= y_16b;
	}

	// Move the robot to the center
	robot.x_24b -= x_16b << 8;
	robot.y_24b -= y_16b << 8;
}

// Adds uncertainty to the particle positions
void posl_particles_add_uncertainty() {
	int i;
	for (i = 0; i < posl.particles.count; i++) {
		int r = mt_lrand();
		posl.particles.item[i].x_16b += r & POSL_PARTICLE_UNCERTAINTY;
		r = r >> 16;
		posl.particles.item[i].x_16b -= r & POSL_PARTICLE_UNCERTAINTY;

		r = mt_lrand();
		posl.particles.item[i].y_16b += r & POSL_PARTICLE_UNCERTAINTY;
		r = r >> 16;
		posl.particles.item[i].y_16b -= r & POSL_PARTICLE_UNCERTAINTY;
	}
}

// Adds an observation and normalizes the particles.
void posl_add_observations() {
	unsigned int max_weight = 0;

	int s;
	int i;
	for (s = 0; s < 4; s++) {
		if (robot.sensor[s].valid == 0) {
			continue;
		}

		// Adjust the particle weights and keep track of the biggest particle
		for (i = 0; i < posl.particles.count; i++) {
			if ((abs(posl.particles.item[i].x_16b - robot.sensor[s].observation.x_16b) < 0x1000) && (abs(posl.particles.item[i].y_16b - robot.sensor[s].observation.y_16b) < 0x1000)) {	// 6.25 cm
				posl.particles.item[i].weight = 0;
			} else {
				unsigned int p_16b = model_expected_hit_probability_16b(posl.particles.item[i].x_16b, posl.particles.item[i].y_16b, robot.sensor[s].observation.x_16b, robot.sensor[s].observation.y_16b);

				if (robot.sensor[s].observation.hit == 0) {
					p_16b = PROBA_1 - p_16b;
				}

				posl.particles.item[i].weight *= p_16b;
				if (posl.particles.item[i].weight > max_weight) {
					max_weight = posl.particles.item[i].weight;
				}
			}
		}

		// Rescale the particles to make sure they fit within 16 bits
		int to_shift = 0;
		while (max_weight >= 0x10000) {
			to_shift++;
			max_weight >>= 1;
		}
		//printf("to_shift %d max_weight %u\n", to_shift, max_weight);
		if (to_shift > 0) {
			for (i = 0; i < posl.particles.count; i++) {
				posl.particles.item[i].weight >>= to_shift;
			}
		}
	}

	// Make a list of big and small particles
	int bigw = 0;
	int smallw = 0;
	int bigi[1024];
	int smalli[1024];
	for (i = 0; i < posl.particles.count; i++) {
		if (posl.particles.item[i].weight < 0x100) {
			smalli[smallw++] = i;
		} else if (posl.particles.item[i].weight > 0x4000) {
			bigi[bigw++] = i;
		}
	}
	//printf("bigw %d smallw %d\n", bigw, smallw);

	// Redistribute small particles to big particles
	int count = (smallw < bigw ? smallw : bigw);
	for (i = 0; i < count; i++) {
		int si = smalli[i];
		int bi = bigi[i];
		posl.particles.item[si].x_16b = posl.particles.item[bi].x_16b;
		posl.particles.item[si].y_16b = posl.particles.item[bi].y_16b;
		posl.particles.item[si].weight = posl.particles.item[bi].weight >> 1;
		posl.particles.item[bi].weight -= posl.particles.item[si].weight; // equivalent à diviser par 2 si oui pourquoi divise pas direct ?
	}

	// Redistribute a few particles around the robot
	for (i = 0; i < 8; i++) {
		posl.particles.item[posl.particles.redistribution_index].x_16b = (mt_lrand() & HISTOGRAM_SIZE) - (HISTOGRAM_SIZE>>1); // [-2, 2] m
		posl.particles.item[posl.particles.redistribution_index].y_16b = (mt_lrand() & HISTOGRAM_SIZE) - (HISTOGRAM_SIZE>>1); // [-2, 2] m
		posl.particles.item[posl.particles.redistribution_index].weight = 0x1000;
		posl.particles.redistribution_index++;
		if (posl.particles.redistribution_index >= posl.particles.count) {
			posl.particles.redistribution_index = 0;
		}
	}
}

// Evaluates the current situation to decide where to go next
void posl_evaluate() {
	posl.targets.best.index = -1;
	posl.targets.best.quality_16b32 = 0;

	// Open file
	//FILE *fh = step_file("evaluation");

	// Prepare rotation with respect to robot heading
	struct sSinCos sincos;
	sincos_prepare(&sincos, robot.heading_16b);
	int cos_15b = sincos.cos_16b >> 1;
	int sin_15b = sincos.sin_16b >> 1;

	int i;
	for (i = 0; i < posl.targets.count; i++) {
		// Robot position
		int x_16b = robot.x_24b >> 8;
		int y_16b = robot.y_24b >> 8;

		// Calculate effective target position
		x_16b += (posl.targets.item[i].x_15b * cos_15b + posl.targets.item[i].y_15b * -sin_15b) >> 14;
		y_16b += (posl.targets.item[i].x_15b * sin_15b + posl.targets.item[i].y_15b * cos_15b) >> 14;

		// Evaluate the possibility of c=0
		posl_add_observation_prediction(x_16b, y_16b, 0);
		unsigned long long int q0_16b32 = posl_quality_prediction_16b32();

		// Evaluate the possibility of c=1
		posl_add_observation_prediction(x_16b, y_16b, 1);
		unsigned long long int q1_16b32 = posl_quality_prediction_16b32();

		// Get the probability of observing c=1 here
		unsigned long long int p_16b = posl_hit_probability_16b(x_16b, y_16b);

		// Final expected quality
		unsigned long long int quality_32b48 = q0_16b32 * (PROBA_1 - p_16b) + q1_16b32 * p_16b;
		unsigned int quality_16b32 = quality_32b48 >> 16;
		//fprintf(fh, "%d %f %f %u %u %u %u %u\n", i, int_16b_to_float(x_16b), int_16b_to_float(y_16b), q0_10b24, 0x100 - p_8b, q1_10b24, p_8b, quality_16b32);
		//fprintf(fh, "%f %f %f %f %f %f\n", int_16b_to_float(x_16b), int_16b_to_float(y_16b), uint_16b_to_float(quality_16b32), uint_16b_to_float(p_16b), uint_16b_to_float(q0_16b32), uint_16b_to_float(q1_16b32));

		// Store the evaluation
		posl.targets.item[i].evaluation.x_16b = x_16b;
		posl.targets.item[i].evaluation.y_16b = y_16b;
		posl.targets.item[i].evaluation.quality_16b32 = quality_16b32;

		// Keep track of the best target
		if ((posl.targets.best.index < 0) || (quality_16b32 > posl.targets.best.quality_16b32)) {
			posl.targets.best.quality_16b32 = quality_16b32;
			posl.targets.best.index = i;
		}
	}

	//fclose(fh);
}

// Calculates the probability of getting a hit at a location.
unsigned int posl_hit_probability_16b(int x_16b, int y_16b) {
	unsigned int sum_16b26 = 0;
	unsigned int probability_sum_22b32 = 0;
	int i;
	for (i = 0; i < posl.particles.count; i++) {
		unsigned int p_16b = model_expected_hit_probability_16b(posl.particles.item[i].x_16b, posl.particles.item[i].y_16b, x_16b, y_16b);
		probability_sum_22b32 += (posl.particles.item[i].weight * p_16b) >> 10;
		sum_16b26 += posl.particles.item[i].weight;
	}
	int sum_6b16 = sum_16b26 >> 10;
	if (sum_6b16 == 0) {
		return 0;
	}
	unsigned int p_16b = probability_sum_22b32 / sum_6b16;
	//printf("%f %f %f %f %f\n", int_16b_to_float(x_16b), int_16b_to_float(y_16b), (float)probability_sum_22b32/(float)0x400000, (float)sum_6b16/(float)0x40, int_16b_to_float(p_16b));
	return p_16b;
}

// Adds a potential observation.
void posl_add_observation_prediction(int x_16b, int y_16b, unsigned int in_plume) {
	unsigned int max_weight_prediction = 0;

	// Adjust the particle weights
	int i;
	for (i = 0; i < posl.particles.count; i++) {
		unsigned int p_16b = model_expected_hit_probability_16b(posl.particles.item[i].x_16b, posl.particles.item[i].y_16b, x_16b, y_16b);

		if (in_plume == 0) {
			p_16b = PROBA_1 - p_16b;
		}

		posl.particles.item[i].weight_prediction = posl.particles.item[i].weight * p_16b;
		if (posl.particles.item[i].weight_prediction > max_weight_prediction) {
			max_weight_prediction = posl.particles.item[i].weight_prediction;
		}
	}

	// If the max particle weight is very big, make all particles smaller
	int to_shift = 0;
	while (max_weight_prediction >= 0x10000) {
		to_shift++;
		max_weight_prediction >>= 1;
	}
	if (to_shift > 0) {
		for (i = 0; i < posl.particles.count; i++) {
			posl.particles.item[i].weight_prediction >>= to_shift;
		}
	}
}

// Calculates the quality based on the weight_prediction field.
unsigned int posl_quality_prediction_16b32() {
	// Prepare histogram bins
	unsigned int sum1_16b26 = 0;
	unsigned int sum2_16b26 = 0;
	unsigned int bin1_16b26[32][32];
	unsigned int bin2_16b26[32][32];
	int x;
	int y;
	for (x = 0; x < 32; x++) {
		for (y = 0; y < 32; y++) { //INITIALISER DIRECT à 0 ={0}
			bin1_16b26[y][x] = 0;
			bin2_16b26[y][x] = 0;
		}
	}

	// Put all particles into their histogram bins: Two histograms shifted by half a bin in both directions to minimize effects of the bin borders.
	int i;
	for (i = 0; i < posl.particles.count; i++) {
		// Histogram bin
		int x1 = (posl.particles.item[i].x_16b - (HISTOGRAM_BIN_SIZE >>1)) >> 14;
		int y1 = (posl.particles.item[i].y_16b - (HISTOGRAM_BIN_SIZE >>1)) >> 14;
		x1 += 16;
		y1 += 16;
		int x2 = (posl.particles.item[i].x_16b + (HISTOGRAM_BIN_SIZE >>1)) >> 14;
		int y2 = (posl.particles.item[i].y_16b + (HISTOGRAM_BIN_SIZE >>1)) >> 14;
		x2 += 16;
		y2 += 16;

		// Check bounds (particles outside are simply ignored) and add to bin
		if ((x1 >= 0) && (x1 < 32) && (y1 >= 0) && (y1 < 32)) {
			sum1_16b26 += posl.particles.item[i].weight_prediction;
			bin1_16b26[y1][x1] += posl.particles.item[i].weight_prediction;
		}
		if ((x2 >= 0) && (x2 < 32) && (y2 >= 0) && (y2 < 32)) {
			sum2_16b26 += posl.particles.item[i].weight_prediction;
			bin2_16b26[y2][x2] += posl.particles.item[i].weight_prediction;
		}
	}

	// TODO: check what the speed of long long ints is on the Khepera III platform and optimize if necessary

	// Sum squares
	unsigned long long int weighted_sum1_32b = 0;
	unsigned long long int weighted_sum2_32b = 0;
	for (x = 0; x < 32; x++) {
		for (y = 0; y < 32; y++) {
			weighted_sum1_32b += (unsigned long long int)bin1_16b26[y][x] * (unsigned long long int)bin1_16b26[y][x];
			weighted_sum2_32b += (unsigned long long int)bin2_16b26[y][x] * (unsigned long long int)bin2_16b26[y][x];
		}
	}

	unsigned long long int sum1_square_32b = (unsigned long long int)sum1_16b26 * (unsigned long long int)sum1_16b26;
	unsigned long long int sum2_square_32b = (unsigned long long int)sum2_16b26 * (unsigned long long int)sum2_16b26;
	//printf("%d %ld %ld %ld %ld\n", target_number, weighted_sum1_32b, weighted_sum2_32b, sum1_square_32b, sum2_square_32b);

	// Normalize
	unsigned long long int normalized1_16b = weighted_sum1_32b / (sum1_square_32b >> 16);
	unsigned long long int normalized2_16b = weighted_sum2_32b / (sum2_square_32b >> 16);
	unsigned long long int normalized_16b = (normalized1_16b + normalized2_16b) >> 1;
	if (normalized_16b > 0xffffffff) {
		return 0xffffffff;
	}
	return (unsigned int)normalized_16b;
	//return 0xffff;
}

// Prints all particles.
void posl_report_particles() {
	FILE *fh = step_file("particles");

	int i;
	for (i = 0; i < posl.particles.count; i++) {
		fprintf(fh, "%f %f %f %f\n", int_16b_to_float(posl.particles.item[i].x_16b), int_16b_to_float(posl.particles.item[i].y_16b), int_16b_to_float(posl.particles.item[i].weight), int_16b_to_float(posl.particles.item[i].weight_prediction));
	}

	fclose(fh);
}
